<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W16 Calculators: one page call; saved inputs kept as sent (every key), changed and deleted. */
class CalculatorsTest extends TestCase
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

    public function test_the_page_is_one_call_with_the_saved_ones_and_what_it_offers(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/calculators' => Http::response([
            'calculations' => [['id' => 1, 'kind' => 'retirement', 'name' => 'Retire at 65', 'inputs' => ['age' => 35]]],
            'prefill' => ['investments' => ['value' => 1000, 'count' => 1], 'spending_now' => 18400],
        ])]);

        $this->signedIn()->get('/calculators?calc=home_loan')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Calculators')
            ->where('calc', 'home_loan')
            ->where('saved.0.name', 'Retire at 65')
            ->where('prefill.spending_now', 18400));
        Http::assertSentCount(2);
    }

    public function test_every_input_is_sent_as_typed_and_a_refusal_comes_back_as_a_message(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/calculations' => Http::sequence()
                ->push(['id' => 5, 'name' => 'A'], 201)
                ->push(['message' => 'The name field is required.', 'errors' => ['name' => ['The name field is required.']]], 422),
        ]);
        $inputs = ['age' => 35, 'raise_mode' => 'percent', 'raise' => 6.5];

        $this->signedIn()->postJson('/calculators/saved', ['kind' => 'retirement', 'name' => 'A', 'inputs' => $inputs])->assertCreated();
        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && $r['inputs'] === $inputs && $r['kind'] === 'retirement');

        $this->postJson('/calculators/saved', ['kind' => 'retirement', 'name' => 'B', 'inputs' => $inputs])->assertUnprocessable();
    }

    public function test_a_saved_one_is_changed_and_deleted_but_never_changes_kind(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/calculations/5' => Http::response(['id' => 5, 'name' => 'New'])]);

        $this->signedIn()->patchJson('/calculators/saved/5', ['name' => 'New', 'inputs' => ['age' => 40]])->assertOk();
        $this->patchJson('/calculators/saved/5', ['kind' => 'growth'])->assertUnprocessable();
        $this->deleteJson('/calculators/saved/5')->assertNoContent();
    }
}
