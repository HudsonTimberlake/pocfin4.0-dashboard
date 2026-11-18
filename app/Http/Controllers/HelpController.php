<?php

namespace App\Http\Controllers;

use App\Services\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W18 Help: short guides (words only, in the browser), Contact us, and Your messages: the
 * person's own conversations with support, shown here and in the app. One call to the page's own
 * endpoint (`?thread=` opens one); starting, replying and closing are small JSON calls. Screenshots
 * are streamed through this app so the browser never needs the API token.
 */
class HelpController extends Controller
{
    public function __construct(private Api $api) {}

    public function show(Request $request): Response
    {
        $page = $this->api->json('/dashboard/help', array_filter(['thread' => $request->integer('thread') ?: null]));

        return Inertia::render('Help', [
            'threads' => $page['data'] ?? [],
            'unread' => $page['unread'] ?? 0,
            'selected' => $page['selected'] ?? null,
            'tab' => in_array($request->query('tab'), ['guides', 'contact', 'messages'], true) ? $request->query('tab') : null,
        ]);
    }

    private function rules(bool $start): array
    {
        return [
            ...($start ? ['kind' => ['required', 'in:problem,question,idea,account']] : []),
            'body' => ['required', 'string', 'max:5000'],
            'images' => ['sometimes', 'array', 'max:3'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp,heic', 'max:5120'],
        ];
    }

    private function files(Request $request): array
    {
        return array_values($request->file('images', []));
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(true), $this->messages());

        return response()->json($this->api->ok($this->api->multipart('/dashboard/support/threads', ['kind' => $data['kind'], 'body' => $data['body']], $this->files($request)))->json(), 201);
    }

    public function reply(Request $request, int $thread): JsonResponse
    {
        $data = $request->validate($this->rules(false), $this->messages());

        return response()->json($this->api->ok($this->api->multipart("/dashboard/support/threads/$thread/messages", ['body' => $data['body']], $this->files($request)))->json(), 201);
    }

    public function close(int $thread): JsonResponse
    {
        return response()->json($this->api->ok($this->api->post("/dashboard/support/threads/$thread/close"))->json());
    }

    public function attachment(int $attachment): HttpResponse
    {
        $response = $this->api->get("/support/attachments/$attachment");
        abort_unless($response->successful(), 404);

        return response($response->body(), 200, ['Content-Type' => $response->header('Content-Type') ?: 'image/jpeg', 'Content-Disposition' => 'inline']);
    }

    private function messages(): array
    {
        return [
            'body.required' => 'Write a message first.',
            'images.max' => 'Add up to 3 screenshots. Email support@pocfin.com to send more.',
            'images.*.max' => 'Choose screenshots under 5 MB.',
            'images.*.mimes' => 'Choose a photo (JPG, PNG, WebP or HEIC).',
        ];
    }
}
