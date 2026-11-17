<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W6/W7 Budget (version 2): "Where does my money sit, and what's off?" One table (Everyday, then
 * Saving up) and, with `?envelope=`, that envelope's panel beside it. One dashboard call.
 */
class BudgetController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): Response
    {
        $b = $shell->budgetId();
        $asked = $request->integer('envelope') ?: null;
        // One call, to the dashboard's own endpoint (API: Dashboard/BudgetPageController).
        $page = $api->json("/dashboard/budgets/$b/budget", array_filter(['envelope' => $asked]));

        $members = collect($page['activity']['members'] ?? [])->keyBy('id');
        $name = fn ($id) => $members[$id]['name'] ?? null;

        // The chosen envelope's newest spending, refunds and allocations, as one list.
        $activity = collect($page['activity']['spent'] ?? [])->map(fn ($x) => [
            'key' => 'x'.$x['id'], 'id' => $x['id'], 'kind' => $x['refund'] ? 'refund' : 'spent', 'note' => $x['note'],
            'date' => $x['date'], 'amount' => $x['amount'], 'by' => $name($x['created_by'] ?? null),
        ])->concat(collect($page['activity']['allocated'] ?? [])->map(fn ($x) => [
            'key' => 'a'.$x['id'], 'id' => $x['id'], 'kind' => 'allocated', 'note' => $x['deposit_note'] ?? ($x['note'] ?? null),
            'date' => $x['date'], 'amount' => $x['amount'], 'by' => $name($x['created_by'] ?? null),
        ]))->sortByDesc('date')->take(8)->values()->all();

        $s = $page['summary'] ?? [];
        $openId = $asked && ($page['selected_id'] ?? null) === $asked ? $asked : null;

        return Inertia::render('Budget', [
            'summary' => [
                'cycle' => $s['cycle'] ?? null,
                'left_to_spend' => $s['left_to_spend'] ?? '0.00',
                'unallocated' => $s['unallocated'] ?? '0.00',
            ],
            'envelopes' => $page['envelopes'] ?? [],
            'archived' => $page['archived'] ?? [],
            'left_from' => isset($page['left_from']) ? ['note' => $page['left_from']['note'] ?? null, 'date' => $page['left_from']['date']] : null,
            'open_id' => $openId,
            'activity' => $openId ? $activity : [],
            'shared' => $members->count() > 1,
        ]);
    }

    public function switch(Request $request, Shell $shell): RedirectResponse
    {
        $shell->choose((int) $request->input('budget_id'));
        $request->session()->forget('history_filters');

        return redirect()->route('overview');
    }
}
