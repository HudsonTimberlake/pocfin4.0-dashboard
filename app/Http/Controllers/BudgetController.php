<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** D3 Budget: every envelope in one table, with the chosen one's activity beside it. */
class BudgetController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        // One call, to the dashboard's own endpoint (API: Dashboard/BudgetPageController).
        $page = $api->json("/dashboard/budgets/$b/budget", array_filter(['envelope' => $request->query('envelope')]));

        $rows = collect($page['envelopes'] ?? []);
        $selected = $rows->firstWhere('id', $page['selected_id'] ?? null);
        $members = collect($page['activity']['members'] ?? [])->keyBy('id');

        $activity = collect($page['activity']['spent'] ?? [])->map(fn ($x) => [
            'kind' => $x['refund'] ? 'Refund' : 'Spent', 'note' => $x['note'], 'date' => $x['date'],
            'amount' => $x['amount'], 'in' => $x['refund'], 'by' => $members[$x['created_by']] ?? null,
        ])->concat(collect($page['activity']['allocated'] ?? [])->map(fn ($x) => [
            'kind' => 'Allocated', 'note' => $x['deposit_note'] ?? ($x['note'] ?? null), 'date' => $x['date'],
            'amount' => $x['amount'], 'in' => true, 'by' => $members[$x['created_by'] ?? null] ?? null,
        ]))->sortByDesc('date')->take(8)->values()->all();

        return view('pages.budget', [
            'summary' => $page['summary'] ?? [],
            'everyday' => $rows->where('kind', 'everyday')->values(),
            'savingUp' => $rows->where('kind', 'saving_up')->values(),
            'selected' => $selected,
            'activity' => $activity,
        ]);
    }

    public function switch(Request $request, Shell $shell): RedirectResponse
    {
        $shell->choose((int) $request->input('budget_id'));
        $request->session()->forget('history_filters');

        return redirect()->route('overview');
    }
}
