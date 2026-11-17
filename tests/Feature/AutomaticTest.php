<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W14 Automatic: one page call; new, changed, paused, deleted; approve, run now and skip a run. */
class AutomaticTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function fake(array $extra = []): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            ...$extra,
        ]);
    }

    public function test_the_page_leaves_out_archived_envelopes(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/automatic*' => Http::response([
            'data' => [['id' => 1, 'name' => 'Netflix']], 'ready' => [['id' => 1, 'name' => 'Netflix']], 'ready_count' => 1, 'selected' => null,
            'envelopes' => [['id' => 8, 'name' => 'Spare', 'balance' => '640.00', 'archived' => false], ['id' => 9, 'name' => 'Old', 'balance' => '0.00', 'archived' => true]],
            'accounts' => [['id' => 11, 'name' => 'Emergency fund', 'type' => 'savings', 'balance' => '42300.00']],
            'members' => [['id' => 7, 'name' => 'Hudson', 'email' => 'x@example.com', 'role' => 'owner']],
        ])]);

        $this->signedIn()->get('/automatic?item=1')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Automatic')
            ->has('ready', 1)
            ->where('envelopes', [['id' => 8, 'name' => 'Spare', 'balance' => '640.00']])
            ->where('members.0', ['id' => 7, 'name' => 'Hudson']));

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/dashboard/budgets/3/automatic') && ($r->data()['item'] ?? null) == 1);
    }

    public function test_writes_go_to_their_paths_with_only_what_belongs(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/automatic' => Http::response(['id' => 7], 201),
            'api.test/api/dashboard/budgets/3/automatic/1' => Http::sequence()->push(['id' => 1])->push(null, 204),
            'api.test/api/dashboard/budgets/3/automatic/1/*' => Http::response(['id' => 1]),
        ]);
        $from = fn () => $this->signedIn()->from('/automatic?item=1');

        $from()->post('/automatic', ['name' => 'Top-up', 'type' => 'transfer', 'from_envelope_id' => 8, 'to_account_id' => 11, 'amount' => '500.00', 'repeat' => 'monthly', 'day' => 25, 'starts_on' => '2026-11-17', 'mode' => 'auto'])
            ->assertRedirect('/automatic?item=7');
        $from()->patch('/automatic/1', ['amount' => '220.00', 'type' => 'expense'])->assertSessionHasErrors('type');
        $from()->patch('/automatic/1', ['amount' => '220.00', 'ends_on' => null])->assertSessionHas('saved', 'automatic');
        $from()->post('/automatic/1/pause')->assertSessionHas('saved', 'pause');
        $from()->post('/automatic/1/runs/11/approve', ['amount' => '250.00', 'overspend' => true])->assertSessionHas('saved', 'approve');
        $from()->post('/automatic/1/runs/11/run-now', ['overspend' => true, 'amount' => '1.00'])->assertSessionHas('saved', 'run-now');
        $from()->post('/automatic/1/runs/11/skip')->assertSessionHas('saved', 'skip');
        $from()->delete('/automatic/1')->assertRedirect('/automatic');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/runs/11/approve') && $r->data() === ['amount' => '250.00']);
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/runs/11/run-now') && $r->data() === ['overspend' => true]);
        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && $r->data() === ['amount' => '220.00', 'ends_on' => null]);
    }

    public function test_a_refusal_comes_back_as_an_error(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/automatic/1/runs/11/run-now' => Http::response(['message' => 'Spare has R40.00 and this needs R199.00.', 'errors' => ['overspend' => ['Spare has R40.00 and this needs R199.00.']]], 422)]);

        $this->signedIn()->from('/automatic?item=1')->post('/automatic/1/runs/11/run-now')->assertSessionHasErrors('overspend');
    }
}
