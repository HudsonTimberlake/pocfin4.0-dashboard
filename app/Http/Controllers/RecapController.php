<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** D6 Recaps: one finished cycle at a time, with the list beside it. Past ones follow the Premium gate. */
class RecapController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        $list = $api->json("/budgets/$b/recaps");
        $cycles = $list['cycles'] ?? [];
        $start = collect($cycles)->firstWhere('start', $request->query('cycle'))['start'] ?? ($cycles[0]['start'] ?? null);
        $recap = $start ? $api->get("/budgets/$b/recaps/$start") : null;

        return view('pages.recaps', [
            'cycles' => $cycles,
            'lockedCount' => $list['locked_count'] ?? 0,
            'start' => $start,
            'recap' => $recap?->successful() ? $recap->json() : null,
            'premiumRequired' => $recap?->status() === 403,
        ]);
    }
}
