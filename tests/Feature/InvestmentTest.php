<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** W12/W12b: holdings, Update values, purpose moves, the rate and money into a holding. */
class InvestmentTest extends TestCase
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

    public function test_holdings_values_and_the_rate_go_to_their_paths(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/accounts/12/holdings' => Http::response(['id' => 30, 'name' => 'Bonds'], 201),
            'api.test/api/dashboard/budgets/3/accounts/12/holdings/21' => Http::response(['id' => 21, 'name' => 'S&P 500']),
            'api.test/api/dashboard/budgets/3/accounts/12/valuations' => Http::response(['saved' => 2], 201),
            'api.test/api/dashboard/budgets/3/accounts/12/holdings/21/valuations/90' => Http::response(null, 204),
            'api.test/api/dashboard/budgets/3/accounts/12/rate' => Http::response(['id' => 12, 'rate' => '18.5000']),
        ]);
        $from = fn () => $this->signedIn()->from('/investments/12');

        $from()->post('/investments/12/holdings', ['name' => 'Bonds'])->assertSessionHas('saved', 'holding');
        $from()->patch('/investments/12/holdings/21', ['name' => 'S&P 500'])->assertSessionHas('saved', 'holding');
        $from()->post('/investments/12/values', ['date' => '2026-11-09', 'values' => [['holding_id' => 21, 'value' => '86500.00'], ['holding_id' => 22, 'value' => '39000.00']]])->assertSessionHas('saved', 'values');
        $from()->delete('/investments/12/holdings/21/values/90')->assertSessionHas('saved', 'value-deleted');
        $from()->put('/investments/12/rate', ['rate' => '18.5000'])->assertSessionHas('saved', 'rate');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/accounts/12/valuations') && $r['date'] === '2026-11-09' && count($r['values']) === 2);
        Http::assertSent(fn (Request $r) => $r->method() === 'PUT' && str_ends_with($r->url(), '/accounts/12/rate') && $r['rate'] === '18.5000');
    }

    public function test_money_into_a_new_purpose_makes_the_purpose_first(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/purposes' => Http::response(['id' => 9, 'name' => 'Travel'], 201),
            'api.test/api/dashboard/budgets/3/accounts/12/transactions' => Http::response(['id' => 70], 201),
        ]);

        $this->signedIn()->from('/investments/12')->post('/investments/12/money', [
            'type' => 'add', 'holding_id' => 21, 'new_purpose' => 'Travel', 'amount' => '1820.00', 'foreign_amount' => '100.00',
            'holding_value' => '86210.40', 'date' => '2026-11-09', 'note' => null,
        ])->assertSessionHas('saved', 'added');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/accounts/12/transactions') && $r['purpose_id'] === 9 && $r['holding_value'] === '86210.40'
            && $r['foreign_amount'] === '100.00' && ! array_key_exists('note', $r->data()) && ! array_key_exists('new_purpose', $r->data()));
    }

    public function test_a_withdrawal_needs_a_purpose_and_a_move_can_make_one(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/purposes' => Http::response(['id' => 9, 'name' => 'Travel'], 201),
            'api.test/api/dashboard/budgets/3/accounts/12/holdings/21/purpose-moves' => Http::response(['moved' => true]),
        ]);

        $this->signedIn()->from('/investments/12')->post('/investments/12/money', ['type' => 'expense', 'holding_id' => 21, 'new_purpose' => 'Travel', 'amount' => '10.00', 'holding_value' => '1.00', 'date' => '2026-11-09'])
            ->assertSessionHasErrors(['purpose_id' => 'Choose what it’s for, or name a new purpose.']);
        $this->signedIn()->from('/investments/12')->post('/investments/12/holdings/21/move', ['from_purpose_id' => 5, 'new_purpose' => 'Travel', 'amount' => '500.00', 'date' => '2026-11-09', 'holding_value' => '86210.40'])
            ->assertSessionHas('saved', 'moved');

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/purpose-moves') && $r['to_purpose_id'] === 9 && $r['from_purpose_id'] === 5);
        Http::assertNotSent(fn (Request $r) => str_ends_with($r->url(), '/accounts/12/transactions'));
    }

    public function test_a_line_error_comes_back_by_name(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/accounts/12/valuations' => Http::response(['message' => 'x', 'errors' => ['values.1.value' => ['The value field format is invalid.']]], 422)]);

        $this->signedIn()->from('/investments/12')->post('/investments/12/values', ['date' => '2026-11-09', 'values' => [['holding_id' => 21, 'value' => '1.00'], ['holding_id' => 22, 'value' => '1.001']]])
            ->assertSessionHasErrors(['values.1.value']);
    }
}
