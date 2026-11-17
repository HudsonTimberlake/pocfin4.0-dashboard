<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W8 Allocate: one page call, one call for every staged line, and the fill mode setting. */
class AllocateTest extends TestCase
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

    private function salary(string $left = '1250.00'): array
    {
        return ['id' => 40, 'amount' => '22850.00', 'allocated' => '21600.00', 'unallocated' => $left, 'date' => '2026-11-01', 'note' => 'Salary', 'created_by' => 7];
    }

    public function test_the_page_leaves_out_investment_accounts_and_shapes_goals(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/allocate*' => Http::response([
            'deposit' => $this->salary(), 'waiting' => [$this->salary()], 'unallocated' => '1250.00',
            'envelopes' => [['id' => 1, 'name' => 'Groceries', 'icon' => null, 'budgeted_amount' => '6000.00', 'kind' => 'everyday', 'balance' => '1491.35', 'sort_order' => 0, 'archived' => false]],
            'accounts' => [
                ['id' => 11, 'name' => 'Emergency fund', 'type' => 'savings', 'balance' => '42300.00'],
                ['id' => 13, 'name' => 'Shares', 'type' => 'investment', 'balance' => '129129.57'],
            ],
            'goals' => [['id' => 1, 'name' => 'Emergency fund', 'account_id' => 11, 'purpose_id' => null, 'this_cycle' => ['left' => '500.00']]],
            'fill_mode' => 'top_up',
        ])]);

        $this->signedIn()->get('/allocate?envelope=1')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Allocate')
                ->where('deposit.unallocated', '1250.00')
                ->has('accounts', 1)
                ->where('accounts.0.name', 'Emergency fund')
                ->where('goals.0.left', '500.00')
                ->where('fill_mode', 'top_up')
                ->where('envelope', 1));
    }

    public function test_every_line_goes_in_one_call(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/deposits/40/allocations' => Http::response(['deposit' => $this->salary('0.00'), 'saved' => 2], 201)]);

        $this->signedIn()->from('/allocate')->post('/allocate/40', ['items' => [
            ['envelope_id' => 1, 'amount' => '1000.00'],
            ['account_id' => 11, 'amount' => '250.00', 'envelope_id' => null],
        ]])->assertRedirect('/allocate?deposit=40')->assertSessionHas('saved', 'allocated');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/deposits/40/allocations')
            && $r['items'] === [['envelope_id' => 1, 'amount' => '1000.00'], ['account_id' => 11, 'amount' => '250.00']]);
    }

    public function test_a_lines_error_comes_back_under_its_name(): void
    {
        $message = 'This income has 1250.00 left to allocate, but you asked for 2000.00.';
        $this->fake(['api.test/api/dashboard/budgets/3/deposits/40/allocations' => Http::response(['message' => $message, 'errors' => ['items.1.amount' => [$message]]], 422)]);

        $this->signedIn()->from('/allocate')->post('/allocate/40', ['items' => [['envelope_id' => 1, 'amount' => '10.00'], ['envelope_id' => 2, 'amount' => '2000.00']]])
            ->assertRedirect('/allocate')->assertSessionHasErrors(['items.1.amount' => $message]);
    }

    public function test_the_fill_mode_is_saved_on_the_person(): void
    {
        $this->fake(['api.test/api/user' => Http::response(['id' => 7, 'fill_mode' => 'add'])]);

        $this->signedIn()->patch('/allocate/mode', ['fill_mode' => 'add'])->assertNoContent();
        $this->signedIn()->patch('/allocate/mode', ['fill_mode' => 'everything'])->assertSessionHasErrors('fill_mode');

        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && str_ends_with($r->url(), '/api/user') && $r['fill_mode'] === 'add');
    }
}
