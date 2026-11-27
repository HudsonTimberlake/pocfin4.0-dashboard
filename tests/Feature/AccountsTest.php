<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** W11 Accounts: new, changed, closed, and money added or withdrawn. */
class AccountsTest extends TestCase
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

    public function test_a_new_account_opens_beside_the_tiles_or_on_its_own_page(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/accounts' => Http::sequence()
            ->push(['id' => 14, 'name' => 'Holiday', 'type' => 'holding'], 201)
            ->push(['id' => 15, 'name' => 'Offshore', 'type' => 'investment'], 201)]);

        $this->signedIn()->post('/accounts', ['name' => 'Holiday', 'type' => 'holding', 'visibility' => 'private'])->assertRedirect('/accounts?account=14');
        $this->signedIn()->post('/accounts', ['name' => 'Offshore', 'type' => 'investment', 'visibility' => 'shared', 'currency' => 'EUR', 'rate' => '19.80'])
            ->assertRedirect(route('investment', ['account' => 15]));

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/accounts') && ($r->data()['currency'] ?? null) === 'EUR' && ($r->data()['rate'] ?? null) === '19.80');
        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/accounts') && ($r->data()['visibility'] ?? null) === 'private' && ! array_key_exists('rate', $r->data()));
    }

    public function test_the_apis_rules_come_back_to_the_form(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/accounts' => Http::response(['message' => 'x', 'errors' => ['currency' => ['Only an investment account can be in dollars.']]], 422)]);

        $this->signedIn()->from('/accounts')->post('/accounts', ['name' => 'Savings', 'type' => 'savings', 'visibility' => 'shared', 'currency' => 'USD', 'rate' => '18'])
            ->assertSessionHasErrors(['currency' => 'Only an investment account can be in dollars.']);
    }

    public function test_change_close_add_and_withdraw(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/accounts/11' => Http::sequence()->push(['id' => 11, 'name' => 'Rainy day'])->push(null, 204),
            'api.test/api/dashboard/budgets/3/accounts/11/transactions' => Http::response(['id' => 70], 201),
        ]);

        $this->signedIn()->from('/accounts?account=11')->patch('/accounts/11', ['name' => 'Rainy day', 'visibility' => 'shared'])->assertSessionHas('saved', 'account');
        $this->signedIn()->from('/accounts?account=11')->post('/accounts/11/transactions', ['type' => 'add', 'amount' => '312.40', 'date' => '2026-10-31', 'note' => 'Interest'])->assertSessionHas('saved', 'added');
        $this->signedIn()->from('/accounts?account=11')->post('/accounts/11/transactions', ['type' => 'income', 'amount' => '1.00', 'date' => '2026-10-31'])->assertSessionHasErrors('type');
        $this->signedIn()->from('/accounts?account=11')->delete('/accounts/11')->assertRedirect('/accounts')->assertSessionHas('saved', 'closed');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/accounts/11/transactions') && $r['type'] === 'add' && $r['note'] === 'Interest');
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/accounts/11'));
    }
}
