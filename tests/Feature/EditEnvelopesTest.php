<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W9 Edit envelopes: one page call, one Save call, and plans. */
class EditEnvelopesTest extends TestCase
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
        $this->fake(['api.test/api/dashboard/budgets/3/edit-envelopes' => Http::response([
            'monthly_income' => '22850.00', 'can_change_income' => false,
            'envelopes' => [
                ['id' => 1, 'name' => 'Groceries', 'icon' => null, 'budgeted_amount' => '6000.00', 'kind' => 'everyday', 'balance' => '1491.35', 'sort_order' => 0, 'archived' => false],
                ['id' => 2, 'name' => 'Old', 'icon' => null, 'budgeted_amount' => '0.00', 'kind' => 'everyday', 'balance' => '0.00', 'sort_order' => 1, 'archived' => true],
            ],
            'plans' => [['id' => 1, 'name' => 'Tight month', 'amounts' => ['1' => '5000.00']]],
        ])]);

        $this->signedIn()->get('/budget/edit')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('EditEnvelopes')
                ->has('envelopes', 1)
                ->where('can_change_income', false)
                ->where('plans.0.name', 'Tight month'));
    }

    public function test_one_save_goes_in_one_call(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/edit-envelopes' => Http::response(['created' => [20]])]);

        $this->signedIn()->from('/budget/edit')->post('/budget/edit', [
            'create' => [['name' => 'Christmas', 'budgeted_amount' => '1000.00', 'kind' => 'saving_up']],
            'update' => [['id' => 1, 'budgeted_amount' => '5500.00']],
            'order' => ['new:0', '1'],
            'monthly_income' => null,
        ])->assertRedirect('/budget/edit')->assertSessionHas('saved', 'envelopes');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/edit-envelopes')
            && $r['create'][0]['kind'] === 'saving_up' && $r['update'] === [['id' => 1, 'budgeted_amount' => '5500.00']]
            && $r['order'] === ['new:0', '1'] && array_key_exists('monthly_income', $r->data()) && $r['monthly_income'] === null);
    }

    public function test_a_parts_error_comes_back_by_name(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/edit-envelopes' => Http::response(['message' => 'x', 'errors' => ['update.0.budgeted_amount' => ['The budgeted amount field format is invalid.']]], 422)]);

        $this->signedIn()->from('/budget/edit')->post('/budget/edit', ['update' => [['id' => 1, 'budgeted_amount' => '5.555']]])
            ->assertSessionHasErrors(['update.0.budgeted_amount']);
    }

    public function test_a_blank_name_reads_plainly(): void
    {
        $this->fake();

        $this->signedIn()->from('/budget/edit')->post('/budget/edit', ['update' => [['id' => 1, 'name' => '   ']]])
            ->assertSessionHasErrors(['update.0.name' => 'Give it a name.']);
        Http::assertNotSent(fn (Request $r) => str_ends_with($r->url(), '/edit-envelopes'));
    }

    public function test_plans_are_saved_and_deleted(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/envelope-plans' => Http::response(['id' => 3, 'name' => 'December'], 201),
            'api.test/api/dashboard/budgets/3/envelope-plans/3' => Http::response(null, 204),
        ]);

        $this->signedIn()->from('/budget/edit')->post('/budget/plans', ['name' => 'December', 'amounts' => ['1' => '7000.00']])->assertSessionHas('saved', 'plan');
        $this->signedIn()->from('/budget/edit')->delete('/budget/plans/3')->assertSessionHas('saved', 'plan-deleted');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/envelope-plans') && $r['amounts'] === ['1' => '7000.00']);
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/envelope-plans/3'));
    }
}
