<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
            // An investment account has its own page.
            return redirect()->route('investment', ['account' => $selected['id'], ...$request->only('period')]);
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

    /**
     * W12/W12b One investment account: "How is it doing?" Worth, gain and simple return first; the
     * holdings with the time-weighted return for the month, year to date or since start; Update
     * values; a holding opens beside the table. A dollar account adds dollars and its rate.
     */
    public function investment(Request $request, int $account): Response
    {
        $period = in_array($request->query('period'), ['cycle', 'ytd', 'all'], true) ? $request->query('period') : 'ytd';
        // One call, to the dashboard's own endpoint (API: Dashboard/AccountsPageController).
        $page = $this->api->json($this->path('accounts'), ['account' => $account, 'period' => $period]);
        $selected = collect($page['accounts'] ?? [])->firstWhere('id', $page['selected_id'] ?? null);
        abort_unless($selected && $selected['type'] === 'investment' && $selected['id'] === $account, 404);

        return Inertia::render('Investment', [
            'account' => array_intersect_key($selected, array_flip(['id', 'name', 'visibility', 'currency', 'usd_rate', 'rate_updated_at', 'balance', 'value', 'gain', 'simple_return', 'created_by'])),
            'holdings' => $page['holdings'] ?? [],
            'returns' => (object) ($page['returns'] ?? []),
            'valuations' => (object) ($page['valuations'] ?? []),
            'purposes' => array_map(fn (array $p) => ['id' => $p['id'], 'name' => $p['name']], $page['purposes'] ?? []),
            'period' => $period,
            'month' => $page['summary']['cycle']['start'] ?? null,
            'members' => array_map(fn (array $m) => ['id' => $m['id'], 'name' => $m['name']], $page['members'] ?? []),
        ]);
    }

    private function holdingPath(int $account, string $rest = ''): string
    {
        return $this->path("accounts/$account".($rest === '' ? '' : "/$rest"));
    }

    public function storeHolding(Request $request, int $account): RedirectResponse
    {
        $this->api->ok($this->api->post($this->holdingPath($account, 'holdings'), $request->validate(['name' => ['required', 'string', 'max:100']])));

        return back()->with('saved', 'holding');
    }

    public function updateHolding(Request $request, int $account, int $holding): RedirectResponse
    {
        $this->api->ok($this->api->patch($this->holdingPath($account, "holdings/$holding"), $request->validate(['name' => ['required', 'string', 'max:100']])));

        return back()->with('saved', 'holding');
    }

    /** Close a holding: each purpose's value goes out as a final withdrawal (the app's rule). */
    public function destroyHolding(int $account, int $holding): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->holdingPath($account, "holdings/$holding")));

        return redirect()->route('investment', ['account' => $account])->with('saved', 'holding-closed');
    }

    /** Update values: every holding typed, one date, all or nothing. */
    public function storeValues(Request $request, int $account): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'values' => ['required', 'array', 'min:1', 'max:100'],
            'values.*.holding_id' => ['required', 'integer'],
            'values.*.value' => ['required', 'string', 'max:20'],
        ]);
        $this->api->ok($this->api->post($this->holdingPath($account, 'valuations'), $data));

        return back()->with('saved', 'values');
    }

    public function destroyValue(int $account, int $holding, int $valuation): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->holdingPath($account, "holdings/$holding/valuations/$valuation")));

        return back()->with('saved', 'value-deleted');
    }

    public function movePurpose(Request $request, int $account, int $holding): RedirectResponse
    {
        $data = $request->validate([
            'from_purpose_id' => ['required', 'integer'],
            'to_purpose_id' => ['nullable', 'integer'],
            'new_purpose' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'holding_value' => ['required', 'string', 'max:20'],
        ]);
        $data['to_purpose_id'] = $data['to_purpose_id'] ?? $this->newPurpose($data['new_purpose'] ?? null, 'to_purpose_id');
        unset($data['new_purpose']);
        $this->api->ok($this->api->post($this->holdingPath($account, "holdings/$holding/purpose-moves"), $data));

        return back()->with('saved', 'moved');
    }

    public function updateRate(Request $request, int $account): RedirectResponse
    {
        $this->api->ok($this->api->put($this->holdingPath($account, 'rate'), $request->validate(['rate' => ['required', 'string', 'max:20']])));

        return back()->with('saved', 'rate');
    }

    /**
     * Add money (outside money) into, or Withdraw from, one holding and purpose. The holding's value
     * just before goes with it (the app pre-fills it the same way); a new purpose is made first.
     */
    public function holdingMoney(Request $request, int $account): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:add,expense'],
            'holding_id' => ['required', 'integer'],
            'purpose_id' => ['nullable', 'integer'],
            'new_purpose' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'string', 'max:20'],
            'foreign_amount' => ['nullable', 'string', 'max:20'],
            'holding_value' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $data['purpose_id'] = $data['purpose_id'] ?? $this->newPurpose($data['type'] === 'add' ? ($data['new_purpose'] ?? null) : null, 'purpose_id');
        unset($data['new_purpose']);
        $this->api->ok($this->api->post($this->holdingPath($account, 'transactions'), array_filter($data, fn ($v) => $v !== null)));

        return back()->with('saved', $data['type'] === 'add' ? 'added' : 'withdrawn');
    }

    /** A new purpose by name (or the field's error when there's neither one nor a name). */
    private function newPurpose(?string $name, string $field): int
    {
        if (! $name || trim($name) === '') {
            throw \Illuminate\Validation\ValidationException::withMessages([$field => ['Choose what it’s for, or name a new purpose.']]);
        }

        return (int) $this->api->ok($this->api->post($this->path('purposes'), ['name' => trim($name)]), ['name' => $field])->json('id');
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
            ? redirect()->route('investment', ['account' => $created['id']])
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
