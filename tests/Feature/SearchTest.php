<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** W4 Search: one call for the names; nothing typed is ever sent. */
class SearchTest extends TestCase
{
    public function test_the_names_come_from_one_call_with_no_query(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/budgets/3/search' => Http::response(['envelopes' => [['id' => 1, 'name' => 'Groceries', 'icon' => null, 'balance' => '10.00']], 'accounts' => [], 'goals' => [], 'unallocated' => '0.00']),
        ]);

        $this->signedIn()->getJson('/search-index')->assertOk()->assertJsonPath('envelopes.0.name', 'Groceries');
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/dashboard/budgets/3/search'));
    }
}
