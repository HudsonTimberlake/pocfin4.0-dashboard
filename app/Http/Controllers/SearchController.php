<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\JsonResponse;

/**
 * W4 Search and jump (⌘K): the names it looks through, fetched when the box opens. Not a page, so
 * it has its own small endpoint (API: Dashboard/SearchPageController). Nothing typed is sent: the
 * matching happens in the browser, so search words never reach a log.
 */
class SearchController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    public function index(): JsonResponse
    {
        return response()->json($this->api->json('/dashboard/budgets/'.$this->shell->budgetId().'/search'));
    }
}
