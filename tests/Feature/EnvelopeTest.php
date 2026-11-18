<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Budget page writes (version 2, W6/W7) go to the dashboard-only envelope paths. */
class EnvelopeTest extends TestCase
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

    public function test_a_new_envelope_a_change_and_the_order(): void
    {
        $this->fake([
            'api.test/api/dashboard/budgets/3/envelopes' => Http::response(['id' => 20], 201),
            'api.test/api/dashboard/budgets/3/envelopes/order' => Http::response([]),
            'api.test/api/dashboard/budgets/3/envelopes/2' => Http::response(['id' => 2]),
        ]);

        $this->signedIn()->from('/budget')->post('/envelopes', ['name' => 'Christmas', 'budgeted_amount' => '1000.00', 'kind' => 'saving_up'])
            ->assertRedirect('/budget')->assertSessionHas('saved', 'envelope');
        $this->signedIn()->from('/budget?envelope=2')->patch('/envelopes/2', ['budgeted_amount' => '1500.00', 'icon' => null])
            ->assertRedirect('/budget?envelope=2')->assertSessionHas('saved', 'changed');
        $this->signedIn()->from('/budget')->put('/envelopes/order', ['ids' => ['3', 1, 2]])->assertSessionHas('saved', 'order');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_ends_with($r->url(), '/dashboard/budgets/3/envelopes') && $r['kind'] === 'saving_up' && $r['budgeted_amount'] === '1000.00');
        Http::assertSent(fn (Request $r) => $r->method() === 'PATCH' && str_ends_with($r->url(), '/envelopes/2') && $r['budgeted_amount'] === '1500.00' && array_key_exists('icon', $r->data()));
        Http::assertSent(fn (Request $r) => $r->method() === 'PUT' && str_ends_with($r->url(), '/envelopes/order') && $r['ids'] === [3, 1, 2]);
    }

    public function test_the_apis_delete_rule_comes_back_as_an_error(): void
    {
        $message = 'Only an envelope with a zero balance can be deleted. Move its money out first, or archive it instead.';
        $this->fake(['api.test/api/dashboard/budgets/3/envelopes/1' => Http::response(['message' => $message, 'errors' => ['envelope' => [$message]]], 422)]);

        $this->signedIn()->from('/budget?envelope=1')->delete('/envelopes/1')
            ->assertRedirect('/budget?envelope=1')->assertSessionHasErrors(['envelope' => $message]);
    }

    public function test_a_delete_goes_back_to_the_budget_without_the_envelope(): void
    {
        $this->fake(['api.test/api/dashboard/budgets/3/envelopes/9' => Http::response(null, 204)]);

        $this->signedIn()->from('/budget?envelope=9')->delete('/envelopes/9')->assertRedirect('/budget')->assertSessionHas('saved', 'deleted');
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && str_ends_with($r->url(), '/envelopes/9'));
    }
}
