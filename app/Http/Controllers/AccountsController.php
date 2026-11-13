<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** D5 Accounts: every account you can see; for an investment account its holdings, returns and purposes. */
class AccountsController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        $period = in_array($request->query('period'), ['cycle', 'ytd', 'all'], true) ? $request->query('period') : 'ytd';
        // One call, to the dashboard's own endpoint (API: Dashboard/AccountsPageController).
        $page = $api->json("/dashboard/budgets/$b/accounts", array_filter(['account' => $request->query('account'), 'period' => $period]));

        $accounts = collect($page['accounts'] ?? []);
        $selected = $accounts->firstWhere('id', $page['selected_id'] ?? null);
        $holdings = $page['holdings'] ?? [];
        $returns = $page['returns'] ?? [];
        $purposes = $page['purposes'] ?? [];
        $moves = $selected ? $this->moves($selected['id'], $page, collect($page['members'] ?? [])->keyBy('id')) : [];

        return view('pages.accounts', [
            'accounts' => $accounts->values()->all(),
            'selected' => $selected,
            'holdings' => $holdings,
            'returns' => $returns,
            'purposes' => $purposes,
            'moves' => $moves,
            'period' => $period,
            'summary' => $page['summary'] ?? [],
        ]);
    }

    /** Money in and out of one account, newest first: allocations, transfers, adds and expenses. */
    private function moves(int $account, array $more, $members): array
    {
        $rows = collect($more['allocations']['data'] ?? [])->map(fn ($x) => [
            'what' => 'From a deposit', 'date' => $x['date'], 'amount' => $x['amount'], 'in' => true, 'by' => $members[$x['created_by']] ?? null,
        ])->concat(collect($more['transfers']['data'] ?? [])->map(fn ($x) => [
            'what' => $x['note'] ?: 'Moved', 'date' => $x['date'], 'amount' => $x['amount'],
            'in' => ($x['to_account_id'] ?? null) === $account, 'by' => $members[$x['created_by']] ?? null,
        ]))->concat(collect($more['transactions']['data'] ?? [])->map(fn ($x) => [
            'what' => $x['note'] ?: (($x['type'] ?? '') === 'add' ? 'Added' : 'Spent'), 'date' => $x['date'], 'amount' => ltrim((string) $x['amount'], '-'),
            'in' => ($x['type'] ?? '') === 'add', 'by' => $members[$x['created_by'] ?? null] ?? null,
        ]));

        return $rows->sortByDesc('date')->take(8)->values()->all();
    }
}
