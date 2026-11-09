<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** D8 Premium: your subscription (managed in the store), payments, and each budget's Premium. */
class PremiumController extends Controller
{
    public function show(Api $api, Shell $shell): View
    {
        $budgets = $shell->budgets();
        $data = $api->many([
            'subscription' => '/subscription',
            'events' => '/subscription/events',
            ...collect($budgets)->mapWithKeys(fn ($b) => ['b'.$b['id'] => "/budgets/{$b['id']}/premium"])->all(),
        ]);

        return view('pages.premium', [
            'subscription' => $data['subscription'] ?? [],
            'events' => $data['events'] ?? ['months_paid' => 0, 'data' => []],
            'budgets' => collect($budgets)->map(fn ($b) => [...$b, 'premium_detail' => $data['b'.$b['id']] ?? null])->all(),
        ]);
    }

    public function covered(Request $request, Api $api): RedirectResponse
    {
        $ids = $request->validate([
            'budget_ids' => ['required', 'array', 'min:1'],
            'budget_ids.*' => ['integer'],
        ], ['budget_ids.required' => 'Pick at least one budget.'])['budget_ids'];

        $api->ok($api->put('/subscription/budgets', ['budget_ids' => array_map('intval', $ids)]));

        return back()->with('status', 'Saved. Everyone in those budgets has Premium.');
    }
}
