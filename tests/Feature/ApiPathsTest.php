<?php

namespace Tests\Feature;

use App\Services\Api;
use Illuminate\Support\Facades\Http;
use LogicException;
use Tests\TestCase;

/** The dashboard may only call the API paths listed in config/dashboard.php (api_paths). */
class ApiPathsTest extends TestCase
{
    public function test_listed_paths_go_through(): void
    {
        Http::fake(['*' => Http::response([])]);
        $api = app(Api::class);

        $api->get('/dashboard/budgets/3/budget', ['envelope' => 2]);
        $api->post('/login', [], signedIn: false);
        $api->get('/admin/users');
        $api->many(['a' => '/dashboard/budgets/3/budget', 'b' => ['/dashboard/budgets/3/history', ['per_page' => 8]]]);

        Http::assertSentCount(5);
    }

    public function test_an_unlisted_path_is_refused_so_nothing_slips_in_unnoticed(): void
    {
        Http::fake(['*' => Http::response([])]);

        $this->expectException(LogicException::class);

        app(Api::class)->get('/budgets/3/goals');
    }

    public function test_an_unlisted_path_in_a_batch_is_refused_too(): void
    {
        Http::fake(['*' => Http::response([])]);

        $this->expectException(LogicException::class);

        app(Api::class)->many(['x' => '/budgets/3/members']);
    }
}
