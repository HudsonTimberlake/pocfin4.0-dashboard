<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\View\View;

/** D5 Accounts: every account you can see; for an investment account its holdings, returns and purposes. */
class AccountsController extends Controller
{
    public function show(Request $request, Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        $base = $api->many([
            'accounts' => "/budgets/$b/accounts",
            'summary' => "/budgets/$b/summary",
            'members' => "/budgets/$b/members",
        ]);
        $accounts = collect($base['accounts'] ?? []);
        $selected = $accounts->firstWhere('id', (int) $request->query('account'))
            ?? $accounts->firstWhere('type', 'investment') ?? $accounts->first();

        $period = in_array($request->query('period'), ['cycle', 'ytd', 'all'], true) ? $request->query('period') : 'ytd';
        $today = Carbon::now(session('timezone', 'Africa/Johannesburg'))->toDateString();
        $from = match ($period) {
            'cycle' => $base['summary']['cycle']['start'] ?? null,
            'ytd' => substr($today, 0, 4).'-01-01',
            'all' => null,
        };

        $holdings = $returns = $purposes = $moves = [];

        if ($selected) {
            $a = $selected['id'];
            $more = $api->many([
                'holdings' => $selected['type'] === 'investment' ? "/budgets/$b/accounts/$a/holdings" : "/budgets/$b/accounts",
                'purposes' => $selected['type'] === 'investment' ? "/budgets/$b/purposes" : "/budgets/$b/accounts",
                'allocations' => "/budgets/$b/accounts/$a/allocations",
                'transactions' => "/budgets/$b/accounts/$a/transactions",
                'transfers' => ["/budgets/$b/transfers", ['account_id' => $a, 'per_page' => 10]],
            ]);

            if ($selected['type'] === 'investment') {
                $holdings = $more['holdings'] ?? [];
                $purposes = $more['purposes'] ?? [];
                $returns = collect($holdings)->isEmpty() ? [] : $api->many(collect($holdings)->mapWithKeys(fn ($h) => [
                    'h'.$h['id'] => ["/budgets/$b/accounts/$a/holdings/{$h['id']}/returns", array_filter(['from' => $from, 'to' => $today])],
                ])->all());
            }

            $moves = $this->moves($a, $more, collect($base['members'] ?? [])->keyBy('id'));
        }

        return view('pages.accounts', [
            'accounts' => $accounts->values()->all(),
            'selected' => $selected,
            'holdings' => $holdings,
            'returns' => $returns,
            'purposes' => $purposes,
            'moves' => $moves,
            'period' => $period,
            'summary' => $base['summary'] ?? [],
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
