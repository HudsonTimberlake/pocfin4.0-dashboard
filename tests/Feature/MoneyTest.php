<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Version 2 writes: the Add panel and in-place edits send their forms to the dashboard-only API paths. */
class MoneyTest extends TestCase
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

    public function test_an_expense_goes_to_the_dashboard_path_and_comes_back_saved(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/expenses' => Http::response(['id' => 1], 201)]);

        $this->signedIn()->from('/')->post('/money/expenses', ['envelope_id' => 1, 'amount' => '842.30', 'date' => '2026-11-09', 'note' => 'Weekly shop', 'refund' => false])
            ->assertRedirect('/')->assertSessionHas('saved', 'expense');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && $r->url() === 'https://api.test/api/dashboard/budgets/3/expenses'
            && $r['amount'] === '842.30' && $r['envelope_id'] === 1 && $r['note'] === 'Weekly shop');
    }

    public function test_the_apis_errors_come_back_to_the_form(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/expenses' => Http::response(['message' => 'x', 'errors' => ['envelope_id' => ['Choose an envelope in this budget.']]], 422)]);

        $this->signedIn()->from('/')->post('/money/expenses', ['envelope_id' => 99, 'amount' => '10.00', 'date' => '2026-11-09'])
            ->assertRedirect('/')->assertSessionHasErrors(['envelope_id' => 'Choose an envelope in this budget.']);
    }

    public function test_income_a_move_spending_from_an_account_and_a_change(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/deposits' => Http::response(['id' => 2], 201),
            'api.test/api/dashboard/budgets/3/transfers' => Http::response(['id' => 3], 201),
            'api.test/api/dashboard/budgets/3/accounts/11/transactions' => Http::response(['id' => 4], 201),
            'api.test/api/dashboard/budgets/3/expenses/5' => Http::response(['id' => 5]),
        ]);

        $this->signedIn()->from('/')->post('/money/income', ['amount' => '22850.00', 'date' => '2026-11-01', 'note' => 'Salary'])->assertSessionHas('saved', 'income');
        $this->signedIn()->from('/')->post('/money/moves', ['from_envelope_id' => 8, 'to_envelope_id' => 2, 'amount' => '180.40', 'date' => '2026-11-09'])->assertSessionHas('saved', 'move');
        $this->signedIn()->from('/')->post('/money/accounts/11/expenses', ['amount' => '500.00', 'date' => '2026-11-09'])->assertSessionHas('saved', 'expense');
        $this->signedIn()->from('/')->patch('/money/expenses/5', ['amount' => '120.50'])->assertSessionHas('saved', 'changed');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/transfers') && ! array_key_exists('from_account_id', $r->data()));
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/accounts/11/transactions') && $r['type'] === 'expense');
        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && $r['amount'] === '120.50');
    }

    public function test_a_delete_is_sent_and_answers_no_content(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/expenses/5' => Http::response(null, 204)]);

        $this->signedIn()->deleteJson('/money/expenses/5')->assertNoContent();
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/expenses/5'));
    }

    public function test_add_options_come_from_the_dashboard_path(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/add' => Http::response(['envelopes' => [], 'accounts' => [], 'envelope_use' => []])]);

        $this->signedIn()->getJson('/add/options')->assertOk()->assertJsonStructure(['envelopes', 'accounts', 'envelope_use']);
    }

    public function test_writes_need_a_sign_in(): void
    {
        Http::fake();
        $this->post('/money/expenses', ['envelope_id' => 1, 'amount' => '1.00', 'date' => '2026-11-09'])->assertRedirect(route('sign-in'));
        Http::assertNothingSent();
    }
}
