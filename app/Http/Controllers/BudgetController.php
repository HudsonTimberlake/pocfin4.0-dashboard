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
        $overview = $api->json("/budgets/$b/overview");
        $envelopes = collect($overview['envelopes'] ?? [])->reject(fn ($e) => $e['archived'] ?? false)->values();

        // This cycle's allocated and spent come from each envelope's own call, all at once.
        $details = $envelopes->isEmpty() ? [] : $api->many(
            $envelopes->mapWithKeys(fn ($e) => ['e'.$e['id'] => "/budgets/$b/envelopes/{$e['id']}"])->all()
        );
        $rows = $envelopes->map(fn ($e) => [...$e, ...collect($details['e'.$e['id']] ?? [])
            ->only(['allocated_this_cycle', 'spent_this_cycle', 'refunded_this_cycle'])->all()]);

        $selected = $rows->firstWhere('id', (int) $request->query('envelope')) ?? $rows->first();
        $activity = [];

        if ($selected) {
            $more = $api->many([
                'spent' => ["/budgets/$b/expenses", ['envelope_id' => $selected['id'], 'per_page' => 8]],
                'allocated' => ["/budgets/$b/envelopes/{$selected['id']}/allocations", []],
                'members' => "/budgets/$b/members",
            ]);
            $members = collect($more['members'] ?? [])->keyBy('id');
            $activity = collect($more['spent']['data'] ?? [])->map(fn ($x) => [
                'kind' => $x['refund'] ? 'Refund' : 'Spent', 'note' => $x['note'], 'date' => $x['date'],
                'amount' => $x['amount'], 'in' => $x['refund'], 'by' => $members[$x['created_by']] ?? null,
            ])->concat(collect($more['allocated']['data'] ?? [])->take(8)->map(fn ($x) => [
                'kind' => 'Allocated', 'note' => $x['deposit_note'] ?? ($x['note'] ?? null), 'date' => $x['date'],
                'amount' => $x['amount'], 'in' => true, 'by' => $members[$x['created_by'] ?? null] ?? null,
            ]))->sortByDesc('date')->take(8)->values()->all();
        }

        return view('pages.budget', [
            'summary' => $overview['summary'] ?? [],
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
