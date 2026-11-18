<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W18 Help: one page call; a message with screenshots goes up as a form; screenshots are streamed. */
class HelpTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function fake(array $extra = []): void
    {
        Http::fake(['api.test/api/dashboard/budgets' => Http::response(self::budgets()), ...$extra]);
    }

    public function test_the_page_is_one_call_and_opens_a_chosen_thread(): void
    {
        $this->fake(['api.test/api/dashboard/help*' => Http::response(['data' => [['id' => 4, 'subject' => 'A question']], 'unread' => 1, 'selected' => ['id' => 4, 'messages' => []]])]);

        $this->signedIn()->get('/help?thread=4&tab=messages')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p
            ->component('Help')->where('unread', 1)->where('selected.id', 4)->where('tab', 'messages'));
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/dashboard/help') && str_contains($r->url(), 'thread=4'));
        Http::assertSentCount(2);
    }

    public function test_a_message_with_screenshots_is_sent_as_a_form_and_a_bad_one_is_refused_here(): void
    {
        $this->fake(['api.test/api/dashboard/support/threads' => Http::response(['id' => 9, 'messages' => []], 201)]);

        $this->signedIn()->post('/help/threads', ['kind' => 'problem', 'body' => 'It broke', 'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.png')]], ['Accept' => 'application/json'])->assertCreated();
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/dashboard/support/threads') && $r->isMultipart() && collect($r->data())->pluck('name')->contains('images[1]'));

        $this->post('/help/threads', ['kind' => 'nonsense', 'body' => 'x'], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_reply_close_and_a_screenshot_stream(): void
    {
        $this->fake([
            'api.test/api/dashboard/support/threads/9/messages' => Http::response(['id' => 9], 201),
            'api.test/api/dashboard/support/threads/9/close' => Http::response(['id' => 9, 'status' => 'closed']),
            'api.test/api/support/attachments/5' => Http::response('IMG', 200, ['Content-Type' => 'image/png']),
        ]);

        $this->signedIn()->postJson('/help/threads/9/messages', ['body' => 'More'])->assertCreated();
        $this->postJson('/help/threads/9/messages', ['body' => ''])->assertUnprocessable();
        $this->postJson('/help/threads/9/close')->assertOk()->assertJsonPath('status', 'closed');
        $this->get('/help/attachments/5')->assertOk()->assertHeader('Content-Type', 'image/png');
    }
}
