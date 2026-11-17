<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W15 Analytics (version 2): "How did this month go?" Month (free; `date` picks another month),
 * Trends and Insights (Premium, as in the app). One dashboard call for the tab shown.
 */
class AnalyticsController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): Response
    {
        $tab = in_array($request->query('tab'), ['month', 'trends', 'insights'], true) ? $request->query('tab') : 'month';
        $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date')) ? $request->query('date') : null;
        // One call, to the dashboard's own endpoint (API: Dashboard/AnalyticsPageController).
        $page = $api->json('/dashboard/budgets/'.$shell->budgetId().'/analytics', array_filter(['tab' => $tab, 'date' => $tab === 'month' ? $date : null]));

        return Inertia::render('Analytics', [
            'tab' => $tab,
            'premium_required' => (bool) ($page['premium_required'] ?? false),
            'month' => $page['month'] ?? null,
            'trends' => $page['trends'] ?? null,
            'insights' => $page['insights'] ?? null,
        ]);
    }
}
