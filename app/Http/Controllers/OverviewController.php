<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\View\View;

/** D2 Overview: what's left to spend, this cycle, accounts, recent activity and the streak. One /overview call. */
class OverviewController extends Controller
{
    public function show(Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        $data = $api->many([
            'overview' => "/budgets/$b/overview",
            'members' => "/budgets/$b/members",
        ]);
        $overview = $data['overview'] ?? [];

        return view('pages.overview', [
            'o' => $overview,
            'members' => collect($data['members'] ?? [])->keyBy('id')->all(),
            'envelopes' => collect($overview['envelopes'] ?? [])->keyBy('id')->all(),
        ]);
    }
}
