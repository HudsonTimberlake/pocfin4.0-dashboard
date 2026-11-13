<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\View\View;

/** D2 Overview: what's left to spend, this cycle, accounts, recent activity and the streak. One dashboard call. */
class OverviewController extends Controller
{
    public function show(Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        // One call, to the dashboard's own endpoint (API: Dashboard/OverviewPageController).
        $overview = $api->json("/dashboard/budgets/$b/overview");

        return view('pages.overview', [
            'o' => $overview,
            'members' => collect($overview['members'] ?? [])->keyBy('id')->all(),
            'envelopes' => collect($overview['envelopes'] ?? [])->keyBy('id')->all(),
        ]);
    }
}
