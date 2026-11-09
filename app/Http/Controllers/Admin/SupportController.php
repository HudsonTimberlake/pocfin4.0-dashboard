<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Api;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\View\View;

/** A3 Support inbox: the conversations, one open beside them, and a reply box. */
class SupportController extends Controller
{
    public function __construct(private Api $api) {}

    public function index(Request $request): View
    {
        $status = in_array($request->query('status'), ['open', 'answered', 'closed'], true) ? $request->query('status') : 'open';
        $list = $this->api->json('/admin/support/threads', ['status' => $status]);
        $threadId = (int) $request->query('thread') ?: ($list['data'][0]['id'] ?? null);
        $thread = $threadId ? $this->api->get("/admin/support/threads/$threadId") : null;

        return view('admin.support', [
            'status' => $status,
            'list' => $list,
            'thread' => $thread?->successful() ? $thread->json() : null,
        ]);
    }

    public function reply(Request $request, int $thread): RedirectResponse
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:5000'], 'password' => ['required', 'string']]);
        $this->api->ok($this->api->post("/admin/support/threads/$thread/messages", $data));

        return redirect()->route('admin.support', ['thread' => $thread, 'status' => 'answered'])->with('status', 'Reply sent.');
    }

    public function status(Request $request, int $thread): RedirectResponse
    {
        $data = $request->validate(['to' => ['required', 'in:close,reopen'], 'password' => ['required', 'string']]);
        $this->api->ok($this->api->post("/admin/support/threads/$thread/{$data['to']}", ['password' => $data['password']]));

        return redirect()->route('admin.support', ['thread' => $thread, 'status' => $data['to'] === 'close' ? 'closed' : 'open']);
    }

    /** Screenshots are streamed through here, so the browser never needs the API token. */
    public function attachment(int $attachment): Response
    {
        $response = $this->api->get("/support/attachments/$attachment");
        abort_unless($response->successful(), 404);

        return response($response->body(), 200, [
            'Content-Type' => $response->header('Content-Type') ?: 'image/jpeg',
            'Content-Disposition' => 'inline',
        ]);
    }
}
