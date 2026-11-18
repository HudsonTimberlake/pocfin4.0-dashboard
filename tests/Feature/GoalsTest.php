<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W13 Goals: one page call, and new, changed, snoozed, finished and deleted goals. */
class GoalsTest extends TestCase
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

    public function test_the_page_and_the_chosen_goal(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/goals*' => Http::response([
            'goals' => [['id' => 4, 'name' => 'Car deposit', 'kind' => 'target', 'state' => 'needs_look']],
            'selected' => ['id' => 4, 'name' => 'Car deposit', 'kind' => 'target', 'state' => 'needs_look', 'cycles' => []],
            'accounts' => [['id' => 12, 'name' => 'Car licence and tax', 'type' => 'holding', 'balance' => '3100.00']],
            'purposes' => [['id' => 5, 'name' => 'Retirement', 'value' => '1.00']],
            'cycle' => ['start' => '2026-11-01', 'end' => '2026-11-30'],
        ])]);

        $this->signedIn()->get('/goals?goal=4')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Goals')
            ->where('selected.id', 4)
            ->where('accounts.0', ['id' => 12, 'name' => 'Car licence and tax', 'type' => 'holding'])
            ->where('purposes.0', ['id' => 5, 'name' => 'Retirement'])
            ->where('cycle.start', '2026-11-01'));

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/dashboard/budgets/3/goals') && ($r->data()['goal'] ?? null) == 4);
    }

    public function test_a_new_goal_opens_and_the_actions_go_to_their_paths(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/goals' => Http::response(['id' => 9], 201),
            'api.test/api/dashboard/budgets/3/goals/4' => Http::sequence()->push(['id' => 4])->push(null, 204),
            'api.test/api/dashboard/budgets/3/goals/4/*' => Http::response(['id' => 4]),
        ]);
        $from = fn () => $this->signedIn()->from('/goals?goal=4');

        $from()->post('/goals', ['kind' => 'target', 'name' => 'Car deposit', 'account_id' => 12, 'target_amount' => '12000.00', 'target_month' => '2027-06', 'purpose_id' => null, 'remind_on_payday' => true])
            ->assertRedirect('/goals?goal=9');
        $from()->put('/goals/4', ['target_month' => '2027-10'])->assertSessionHas('saved', 'goal');
        $from()->post('/goals/4/snooze')->assertSessionHas('saved', 'snooze');
        $from()->post('/goals/4/finish', ['reached' => true])->assertSessionHas('saved', 'finish');
        $from()->post('/goals/4/everything')->assertNotFound();
        $from()->delete('/goals/4')->assertRedirect('/goals');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/goals') && ! array_key_exists('purpose_id', $r->data()) && $r['remind_on_payday'] === true);
        Http::assertSent(fn (Request $r) => $r->method() === 'PUT' && $r->data() === ['target_month' => '2027-10']);
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/goals/4/finish') && $r['reached'] === true);
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/goals/4/snooze') && $r->data() === []);
    }

    public function test_the_apis_errors_come_back_to_the_form(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/goals' => Http::response(['message' => 'x', 'errors' => ['account_id' => ['This account already has a goal.']]], 422)]);

        $this->signedIn()->from('/goals')->post('/goals', ['kind' => 'habit', 'name' => 'Again', 'account_id' => 11, 'amount_per_cycle' => '100.00'])
            ->assertSessionHasErrors(['account_id' => 'This account already has a goal.']);
    }
}
