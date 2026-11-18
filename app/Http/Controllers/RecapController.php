<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** W-Recaps (version 2): one finished cycle at a time, with the list beside it. Past ones follow the Premium gate. */
class RecapController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): Response
    {
        $b = $shell->budgetId();
        // One call, to the dashboard's own endpoint (API: Dashboard/RecapsPageController).
        $page = $api->json("/dashboard/budgets/$b/recaps", array_filter(['cycle' => $request->query('cycle')]));

        return Inertia::render('Recaps', [
            'cycles' => $page['cycles'] ?? [],
            'lockedCount' => $page['locked_count'] ?? 0,
            'start' => $page['start'] ?? null,
            'recap' => $page['recap'] ?? null,
            'premiumRequired' => $page['premium_required'] ?? false,
        ]);
    }
}
