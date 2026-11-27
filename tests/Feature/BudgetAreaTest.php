<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W17 Notes, W17b Members, W17c Budget settings: one page call each; small JSON changes; a 403 is a message. */
class BudgetAreaTest extends TestCase
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

    public function test_each_page_is_one_call_to_its_own_endpoint(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/notes' => Http::response(['notes' => [['id' => 1, 'body' => 'Hi']], 'cycle' => ['start' => '2026-11-01', 'end' => '2026-11-30']]),
            'api.test/api/dashboard/budgets/3/members' => Http::response(['me' => 7, 'is_owner' => true, 'members' => [['id' => 7, 'name' => 'H', 'email' => 'h@example.com', 'role' => 'owner']], 'invitations' => []]),
            'api.test/api/dashboard/budgets/3/settings' => Http::response(['id' => 3, 'name' => 'Our home', 'cycle_start_day' => 1, 'role' => 'owner', 'premium' => ['active' => true]]),
        ]);

        $this->signedIn()->get('/notes')->assertInertia(fn (AssertableInertia $p) => $p->component('Notes')->where('notes.0.body', 'Hi')->where('cycle.start', '2026-11-01'));
        $this->get('/members')->assertInertia(fn (AssertableInertia $p) => $p->component('Members')->where('isOwner', true)->where('me', 7));
        $this->get('/settings')->assertInertia(fn (AssertableInertia $p) => $p->component('BudgetSettings')->where('budget.name', 'Our home')->where('budgets.0.currency', 'ZAR'));
    }

    public function test_a_note_is_added_changed_and_deleted_and_a_refusal_is_a_message(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/notes' => Http::response(['id' => 9, 'body' => 'Plan'], 201),
            'api.test/api/dashboard/budgets/3/notes/9' => Http::sequence()->push(['id' => 9, 'body' => 'New'])->push(['message' => 'Only the author can change this note.'], 403)->push(null, 204),
        ]);

        $this->signedIn()->postJson('/notes', ['body' => 'Plan', 'shared' => true, 'this_cycle' => true])->assertCreated();
        $this->patchJson('/notes/9', ['body' => 'New'])->assertOk();
        $this->patchJson('/notes/9', ['body' => 'Again'])->assertUnprocessable()->assertJsonPath('errors.form.0', 'Only the author can change this note.');
        $this->deleteJson('/notes/9')->assertNoContent();
    }

    public function test_invites_owner_and_leaving(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/invitations' => Http::response(['id' => 2, 'email' => 'a@example.com'], 201),
            'api.test/api/dashboard/budgets/3/invitations/2' => Http::response(null, 204),
            'api.test/api/dashboard/budgets/3/members/8' => Http::response(null, 204),
            'api.test/api/dashboard/budgets/3/owner' => Http::response(null, 204),
            'api.test/api/dashboard/budgets/3/leave' => Http::response(null, 204),
        ]);

        $this->signedIn()->postJson('/members/invitations', ['email' => 'a@example.com'])->assertCreated();
        $this->postJson('/members/invitations', ['email' => 'not an email'])->assertUnprocessable();
        $this->deleteJson('/members/invitations/2')->assertNoContent();
        $this->deleteJson('/members/8')->assertNoContent();
        $this->putJson('/members/owner', ['user_id' => 8])->assertNoContent();
        $this->postJson('/members/leave')->assertOk()->assertJsonPath('to', '/');
        $this->assertNull(session('budget_id'));
    }

    public function test_settings_change_and_delete_the_budget(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3' => Http::sequence()->push(['id' => 3, 'name' => 'Our flat', 'cycle_start_day' => 25])->push(null, 204)]);

        $this->signedIn()->patchJson('/settings', ['name' => 'Our flat', 'cycle_start_day' => 25])->assertOk()->assertJsonPath('cycle_start_day', 25);
        $this->patchJson('/settings', ['cycle_start_day' => 31])->assertUnprocessable();
        $this->deleteJson('/settings')->assertOk()->assertJsonPath('to', '/');
    }

    /** design/currencies.md: the owner changes it while the budget is empty; the API says no after that. */
    public function test_the_currency_goes_to_the_api_and_its_refusal_comes_back(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3' => Http::sequence()
            ->push(['id' => 3, 'name' => 'Our home', 'currency' => 'EUR', 'cycle_start_day' => 1])
            ->push(['message' => 'x', 'errors' => ['currency' => ['The currency can only change before any money is added to the budget.']]], 422)]);

        $this->signedIn()->patchJson('/settings', ['currency' => 'EUR'])->assertOk()->assertJsonPath('currency', 'EUR');
        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && ($r->data()['currency'] ?? null) === 'EUR');

        $this->patchJson('/settings', ['currency' => 'GBP'])->assertUnprocessable()->assertJsonPath('errors.currency.0', 'The currency can only change before any money is added to the budget.');
    }
}
