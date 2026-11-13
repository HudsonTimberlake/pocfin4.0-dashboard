<?php

namespace App\Services;

use App\Exceptions\AdminCodeRequired;
use App\Exceptions\ApiUnavailable;
use App\Exceptions\SignedOut;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Every call to the PocFin API goes through here. The visitor's API token lives only in the
 * encrypted server-side session, never in the browser. Each call passes on the visitor's address
 * (with the shared key, for the API's rate limits) and their time zone (for "today").
 */
class Api
{
    public function request(bool $signedIn = true): PendingRequest
    {
        $request = Http::baseUrl(config('dashboard.api_url'))
            ->acceptJson()
            ->timeout(20)
            ->withHeaders(array_filter([
                'X-Timezone' => session('timezone', 'Africa/Johannesburg'),
                'X-Dashboard-Key' => config('dashboard.key'),
                'X-Dashboard-Client-Ip' => config('dashboard.key') ? request()->ip() : null,
            ]));

        if ($signedIn && $token = $this->token()) {
            $request->withToken($token);
        }

        return $request;
    }

    public function get(string $path, array $query = []): Response
    {
        $this->allow($path);

        return $this->send(fn () => $this->request()->get($path, $query), 'GET '.$path);
    }

    public function post(string $path, array $data = [], bool $signedIn = true): Response
    {
        $this->allow($path);

        return $this->send(fn () => $this->request($signedIn)->post($path, $data), 'POST '.$path);
    }

    public function put(string $path, array $data = []): Response
    {
        $this->allow($path);

        return $this->send(fn () => $this->request()->put($path, $data), 'PUT '.$path);
    }

    public function patch(string $path, array $data = []): Response
    {
        $this->allow($path);

        return $this->send(fn () => $this->request()->patch($path, $data), 'PATCH '.$path);
    }

    public function delete(string $path, array $data = []): Response
    {
        $this->allow($path);

        return $this->send(fn () => $this->request()->delete($path, $data), 'DELETE '.$path);
    }

    /** The JSON of a GET that must work. */
    public function json(string $path, array $query = []): array
    {
        return $this->ok($this->get($path, $query))->json() ?? [];
    }

    /**
     * Several GETs at once, keyed like $paths ([key => path] or [key => [path, query]]).
     *
     * @return array<string, array|null> null where that one failed with a 4xx
     */
    public function many(array $paths): array
    {
        foreach ($paths as $path) {
            $this->allow(is_array($path) ? $path[0] : $path);
        }

        $headers = $this->request()->getOptions()['headers'] ?? [];

        $started = hrtime(true);

        try {
            $responses = Http::pool(function (Pool $pool) use ($paths, $headers) {
                foreach ($paths as $key => $path) {
                    [$url, $query] = is_array($path) ? $path : [$path, []];
                    $pool->as((string) $key)->baseUrl(config('dashboard.api_url'))->acceptJson()->timeout(20)
                        ->withHeaders($headers)->get($url, $query);
                }
            });
        } catch (ConnectionException $e) {
            throw new ApiUnavailable($e->getMessage(), 0, $e);
        }

        $this->timed('MANY ('.count($paths).') '.implode(', ', array_map(fn ($p) => is_array($p) ? $p[0] : $p, array_slice($paths, 0, 3))), $started, 'batch');

        $out = [];

        foreach ($paths as $key => $_) {
            $response = $responses[(string) $key] ?? null;

            if (! $response instanceof Response) {
                throw new ApiUnavailable('The API could not be reached.');
            }

            $this->check($response);
            $out[$key] = $response->successful() ? $response->json() : null;
        }

        return $out;
    }

    /** Throws the API's 422 as our own validation errors, so the form shows them. Other failures throw. */
    public function ok(Response $response, array $rename = []): Response
    {
        if ($response->status() === 422) {
            $errors = collect($response->json('errors') ?? ['form' => [$response->json('message') ?? 'That didn’t work.']])
                ->mapWithKeys(fn ($messages, $field) => [$rename[$field] ?? $field => (array) $messages])
                ->all();

            throw ValidationException::withMessages($errors);
        }

        if (! $response->successful()) {
            throw new ApiUnavailable('The API answered '.$response->status().'.');
        }

        return $response;
    }

    public function token(): ?string
    {
        $stored = session('api_token');

        return $stored ? Crypt::decryptString($stored) : null;
    }

    public static function storeToken(string $token): void
    {
        session(['api_token' => Crypt::encryptString($token)]);
    }

    /**
     * With DASHBOARD_LOG_TIMING=true, one line per API call (or batch) and how long it took, so a
     * slow page shows whether it is the server or the calls. Paths only, never query words or bodies.
     */
    private function timed(string $label, int $started, string $status): void
    {
        if (config('dashboard.log_timing')) {
            Log::info('api', ['call' => $label, 'status' => $status, 'ms' => (int) round((hrtime(true) - $started) / 1e6)]);
        }
    }

    /** Only paths in config('dashboard.api_paths') may be called, so what the dashboard uses is always one visible list. */
    private function allow(string $path): void
    {
        $path = '/'.ltrim(parse_url($path, PHP_URL_PATH) ?: $path, '/');

        foreach (config('dashboard.api_paths', []) as $patterns) {
            foreach ($patterns as $pattern) {
                if (fnmatch($pattern, $path)) {
                    return;
                }
            }
        }

        $message = "The dashboard called $path, which isn't in config/dashboard.php api_paths.";

        if (app()->isProduction()) {
            Log::warning($message);

            return;
        }

        throw new LogicException($message);
    }

    private function send(callable $call, string $label): Response
    {
        $started = hrtime(true);

        try {
            $response = $call();
        } catch (ConnectionException $e) {
            $this->timed($label, $started, 'failed');

            throw new ApiUnavailable($e->getMessage(), 0, $e);
        }

        $this->timed($label, $started, (string) $response->status());

        $this->check($response);

        return $response;
    }

    private function check(Response $response): void
    {
        if ($response->status() === 401 && session()->has('api_token')) {
            throw new SignedOut;
        }

        if ($response->status() === 403 && $response->json('code') === 'admin_code_required') {
            throw new AdminCodeRequired;
        }

        if ($response->serverError()) {
            throw new ApiUnavailable('The API answered '.$response->status().'.');
        }
    }
}
