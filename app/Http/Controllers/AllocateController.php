<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W8 Allocate (version 2): "Where should this money go?" Staged in the browser with Undo and Undo
 * all, as on the phone; one Allocate sends every line in one call (all or nothing). W8b, the
 * Allocated card, is drawn by the page from what it sent and the fresh figures.
 */
class AllocateController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(Request $request): Response
    {
        // One call, to the dashboard's own endpoint (API: Dashboard/AllocatePageController).
        $page = $this->api->json($this->path('allocate'), array_filter(['deposit' => $request->integer('deposit') ?: null]));
        $name = fn (array $a) => ['id' => $a['id'], 'name' => $a['name'], 'type' => $a['type'], 'balance' => $a['balance']];

        return Inertia::render('Allocate', [
            'deposit' => $page['deposit'] ?? null,
            'waiting' => $page['waiting'] ?? [],
            'unallocated' => $page['unallocated'] ?? '0.00',
            'envelopes' => $page['envelopes'] ?? [],
            // Savings and holding accounts take an amount here; investments need a holding and its value (the app, or W12).
            'accounts' => array_values(array_map($name, array_filter($page['accounts'] ?? [], fn ($a) => ($a['type'] ?? '') !== 'investment'))),
            'goals' => array_map(fn (array $g) => [
                'id' => $g['id'], 'name' => $g['name'], 'account_id' => $g['account_id'] ?? null, 'purpose_id' => $g['purpose_id'] ?? null,
                'left' => $g['this_cycle']['left'],
            ], $page['goals'] ?? []),
            'fill_mode' => $page['fill_mode'] ?? 'add',
            'envelope' => $request->integer('envelope') ?: null,
        ]);
    }

    public function store(Request $request, int $deposit): RedirectResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:60'],
            'items.*.envelope_id' => ['nullable', 'integer'],
            'items.*.account_id' => ['nullable', 'integer'],
            'items.*.amount' => ['required', 'string', 'max:20'],
        ]);
        $items = array_map(fn ($i) => array_filter($i, fn ($v) => $v !== null), $data['items']);
        $this->api->ok($this->api->post($this->path("deposits/$deposit/allocations"), ['items' => $items]));

        return redirect()->route('allocate', ['deposit' => $deposit])->with('saved', 'allocated');
    }

    /** Top up or Add monthly amount, remembered per person (the app's own setting). */
    public function mode(Request $request): HttpResponse
    {
        $data = $request->validate(['fill_mode' => ['required', 'in:add,top_up']]);
        $this->api->ok($this->api->patch('/user', $data));

        return response()->noContent();
    }
}
