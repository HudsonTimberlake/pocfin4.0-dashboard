<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * W11 Accounts (version 2): "What's everything worth?" The total first, account tiles, what the
 * investments are for; a savings or holding account opens beside the tiles (`?account=`). An
 * investment account has its own page (`/investments/{id}`, W12).
 */
class AccountsController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(Request $request): Response|RedirectResponse|SymfonyResponse
    {
        $asked = $request->integer('account') ?: null;
        // One call, to the dashboard's own endpoint (API: Dashboard/AccountsPageController).
        $page = $this->api->json($this->path('accounts'), array_filter(['account' => $asked]));
        $accounts = collect($page['accounts'] ?? []);
        $selected = $asked ? $accounts->firstWhere('id', $asked) : null;

        if ($selected && $selected['type'] === 'investment') {
            // Its own page (still a release 1 view until W12): a full load from React.
            return leave(route('investment', ['account' => $selected['id'], ...$request->only('period')]));
        }
        $members = collect($page['members'] ?? [])->keyBy('id');

        return Inertia::render('Accounts', [
            'accounts' => $accounts->map(fn (array $a) => [
                ...array_intersect_key($a, array_flip(['id', 'name', 'type', 'visibility', 'currency', 'balance', 'value', 'gain', 'created_by', 'simple_return'])),
                'mine' => ($a['created_by'] ?? null) === ($this->shell->user()['id'] ?? null),
            ])->values(),
            'totals' => $page['summary']['accounts'] ?? ['savings' => '0.00', 'holding' => '0.00', 'investments' => '0.00', 'total' => '0.00'],
            'purposes' => array_map(fn (array $p) => array_intersect_key($p, array_flip(['id', 'name', 'value', 'gain', 'net_contributed'])), $page['purposes'] ?? []),
            'goals' => array_map(fn (array $g) => [
                'id' => $g['id'], 'name' => $g['name'], 'account_id' => $g['account_id'], 'kind' => $g['kind'], 'state' => $g['state'] ?? null,
                'target_amount' => $g['target_amount'] ?? null, 'total' => $g['total'] ?? null, 'this_cycle' => $g['this_cycle'] ?? null,
            ], $page['goals'] ?? []),
            'open_id' => $selected ? $selected['id'] : null,
            'moves' => $selected ? $this->moves($selected['id'], $page, $members, $accounts) : [],
            'shared' => $members->count() > 1,
            'budget_name' => $this->shell->budget()['name'] ?? 'this budget',
        ]);
    }

    /** Money in and out of one account, newest first: allocations, moves, adds and withdrawals. */
    private function moves(int $account, array $page, Collection $members, Collection $accounts): array
    {
        $who = fn ($id) => $members[$id]['name'] ?? null;
        $other = function (array $x, bool $in) use ($accounts) {
            $id = $in ? ($x['from_account_id'] ?? null) : ($x['to_account_id'] ?? null);
            $private = $in ? ($x['from_private_account'] ?? false) : ($x['to_private_account'] ?? false);

            return $id ? ($accounts->firstWhere('id', $id)['name'] ?? 'an account') : ($private ? 'a private account' : 'an envelope');
        };

        return collect($page['allocations']['data'] ?? [])->map(fn ($x) => [
            'key' => 'a'.$x['id'], 'what' => 'From '.($x['deposit_note'] ?? null ?: 'income'), 'kind' => 'Allocated', 'date' => $x['date'], 'amount' => $x['amount'], 'in' => true, 'by' => $who($x['created_by'] ?? null),
        ])->concat(collect($page['transfers']['data'] ?? [])->map(function ($x) use ($account, $who, $other) {
            $in = ($x['to_account_id'] ?? null) === $account;

            return ['key' => 'm'.$x['id'], 'what' => $x['note'] ?: ($in ? 'From ' : 'To ').$other($x, $in), 'kind' => 'Moved', 'date' => $x['date'], 'amount' => $x['amount'], 'in' => $in, 'by' => $who($x['created_by'] ?? null)];
        }))->concat(collect($page['transactions']['data'] ?? [])->map(fn ($x) => [
            'key' => 't'.$x['id'], 'what' => $x['note'] ?: (($x['type'] ?? '') === 'add' ? 'Added' : 'Withdrawn'), 'kind' => ($x['type'] ?? '') === 'add' ? 'Added' : 'Withdrawn',
            'date' => $x['date'], 'amount' => ltrim((string) $x['amount'], '-'), 'in' => ($x['type'] ?? '') === 'add', 'by' => $who($x['created_by'] ?? null),
        ]))->sortByDesc('date')->take(12)->values()->all();
    }

    /** One investment account (W12 comes next; until then the release 1 view). */
    public function investment(Request $request, int $account): View
    {
        $period = in_array($request->query('period'), ['cycle', 'ytd', 'all'], true) ? $request->query('period') : 'ytd';
        $page = $this->api->json($this->path('accounts'), ['account' => $account, 'period' => $period]);
        $selected = collect($page['accounts'] ?? [])->firstWhere('id', $page['selected_id'] ?? null);
        abort_unless($selected && $selected['type'] === 'investment' && $selected['id'] === $account, 404);

        return view('pages.accounts', [
            'accounts' => $page['accounts'],
            'selected' => $selected,
            'holdings' => $page['holdings'] ?? [],
            'returns' => $page['returns'] ?? [],
            'purposes' => $page['purposes'] ?? [],
            // The release 1 view names who by a member record.
            'moves' => array_map(fn (array $m) => [...$m, 'by' => $m['by'] ? ['name' => $m['by']] : null], $this->moves($account, $page, collect($page['members'] ?? [])->keyBy('id'), collect($page['accounts']))),
            'period' => $period,
            'summary' => $page['summary'] ?? [],
        ]);
    }

    public function store(Request $request): RedirectResponse|SymfonyResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:savings,holding,investment'],
            'visibility' => ['required', 'in:shared,private'],
            'currency' => ['sometimes', 'in:ZAR,USD'],
            'usd_rate' => ['nullable', 'string', 'max:20'],
        ]);
        $created = $this->api->ok($this->api->post($this->path('accounts'), array_filter($data, fn ($v) => $v !== null)))->json();

        // A new investment goes to its own page (holdings are added there); the rest open beside the tiles.
        return ($created['type'] ?? '') === 'investment'
            ? leave(route('investment', ['account' => $created['id']]))
            : redirect()->route('accounts', ['account' => $created['id']])->with('saved', 'account');
    }

    public function update(Request $request, int $account): RedirectResponse
    {
        $data = $request->validate(['name' => ['sometimes', 'string', 'max:100'], 'visibility' => ['sometimes', 'in:shared,private']]);
        $this->api->ok($this->api->patch($this->path("accounts/$account"), $data));

        return back()->with('saved', 'account');
    }

    public function destroy(int $account): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->path("accounts/$account")));

        return redirect()->route('accounts')->with('saved', 'closed');
    }

    /** Add money (outside money: interest, a gift) or Withdraw (it leaves PocFin). */
    public function transaction(Request $request, int $account): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:add,expense'],
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $this->api->ok($this->api->post($this->path("accounts/$account/transactions"), $data));

        return back()->with('saved', $data['type'] === 'add' ? 'added' : 'withdrawn');
    }
}
