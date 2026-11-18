<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W14 Automatic (version 2): "What's going off, and does anything need me?" Waiting for you first
 * (Approve, Change amount for this time, Skip), then every payment; one opens beside the table
 * (`?item=`), and New automatic (W14b) too. Free, like the app.
 */
class AutomaticController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(Request $request): Response
    {
        // One call, to the dashboard's own endpoint (API: Dashboard/AutomaticPageController).
        $page = $this->api->json($this->path('automatic'), array_filter(['item' => $request->integer('item') ?: null]));
        $place = fn (array $x) => ['id' => $x['id'], 'name' => $x['name'], 'balance' => $x['balance']];

        return Inertia::render('Automatic', [
            'items' => $page['data'] ?? [],
            'ready' => $page['ready'] ?? [],
            'selected' => $page['selected'] ?? null,
            'envelopes' => array_values(array_map($place, array_filter($page['envelopes'] ?? [], fn ($e) => ! ($e['archived'] ?? false)))),
            'accounts' => array_map(fn ($a) => [...$place($a), 'type' => $a['type']], $page['accounts'] ?? []),
            'members' => array_map(fn ($m) => ['id' => $m['id'], 'name' => $m['name']], $page['members'] ?? []),
            // From an Insight's Make it automatic: New automatic opens, filled in from this browser tab.
            'start_new' => $request->boolean('new'),
        ]);
    }

    private function rules(bool $create): array
    {
        $req = $create ? 'required' : 'sometimes';

        return [
            'name' => [$req, 'string', 'max:40'],
            'type' => $create ? ['required', 'in:expense,transfer'] : ['prohibited'],
            'from_envelope_id' => ['sometimes', 'integer'],
            'from_account_id' => ['sometimes', 'integer'],
            'to_envelope_id' => ['sometimes', 'integer'],
            'to_account_id' => ['sometimes', 'integer'],
            'amount' => [$req, 'string', 'max:20'],
            'repeat' => [$req, 'in:monthly,weekly'],
            'day' => ['sometimes', 'nullable', 'integer', 'between:1,28'],
            'last_day' => ['sometimes', 'boolean'],
            'weekday' => ['sometimes', 'nullable', 'integer', 'between:0,6'],
            'starts_on' => [$req, 'date_format:Y-m-d'],
            'ends_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'mode' => [$req, 'in:auto,approve'],
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $id = $this->api->ok($this->api->post($this->path('automatic'), $request->validate($this->rules(true))))->json('id');

        return redirect()->route('automatic', ['item' => $id])->with('saved', 'automatic');
    }

    public function update(Request $request, int $item): RedirectResponse
    {
        $this->api->ok($this->api->patch($this->path("automatic/$item"), $request->validate($this->rules(false))));

        return back()->with('saved', 'automatic');
    }

    public function destroy(int $item): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->path("automatic/$item")));

        return redirect()->route('automatic')->with('saved', 'automatic-deleted');
    }

    public function toggle(int $item, string $action): RedirectResponse
    {
        $this->api->ok($this->api->post($this->path("automatic/$item/$action")));

        return back()->with('saved', $action);
    }

    /** Approve (optional amount, this time only), Run now (optional overspend) or Skip one run. */
    public function run(Request $request, int $item, int $run, string $action): RedirectResponse
    {
        $data = $request->validate(['amount' => ['sometimes', 'string', 'max:20'], 'overspend' => ['sometimes', 'boolean']]);
        $body = match ($action) {
            'approve' => array_intersect_key($data, ['amount' => 1]),
            'run-now' => array_intersect_key($data, ['overspend' => 1]),
            default => [],
        };
        $this->api->ok($this->api->post($this->path("automatic/$item/runs/$run/$action"), $body));

        return back()->with('saved', $action);
    }
}
