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
use Illuminate\Validation\ValidationException;

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
        return $this->send(fn () => $this->request()->get($path, $query));
    }

    public function post(string $path, array $data = [], bool $signedIn = true): Response
    {
        return $this->send(fn () => $this->request($signedIn)->post($path, $data));
    }

    public function put(string $path, array $data = []): Response
    {
        return $this->send(fn () => $this->request()->put($path, $data));
    }

    public function patch(string $path, array $data = []): Response
    {
        return $this->send(fn () => $this->request()->patch($path, $data));
    }

    public function delete(string $path, array $data = []): Response
    {
        return $this->send(fn () => $this->request()->delete($path, $data));
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
        $headers = $this->request()->getOptions()['headers'] ?? [];

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

    private function send(callable $call): Response
    {
        try {
            $response = $call();
        } catch (ConnectionException $e) {
            throw new ApiUnavailable($e->getMessage(), 0, $e);
        }

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
