<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** D8 Premium: your subscription (managed in the store), payments, and each budget's Premium. */
class PremiumController extends Controller
{
    public function show(Api $api, Shell $shell): Response
    {
        $budgets = $shell->budgets();
        // One call, to the dashboard's own endpoint (API: Dashboard/PremiumPageController).
        $data = $api->json('/dashboard/premium');

        return Inertia::render('Premium', [
            'subscription' => $data['subscription'] ?? [],
            'events' => $data['events'] ?? ['months_paid' => 0, 'data' => []],
            'budgets' => collect($budgets)->map(fn ($b) => ['id' => $b['id'], 'name' => $b['name'], 'premium' => $data['budgets'][$b['id']] ?? $b['premium']])->all(),
            'manage' => [
                'app_store' => config('dashboard.manage_urls.app_store'),
                'play_store' => config('dashboard.manage_urls.play_store'),
            ],
        ]);
    }

    public function covered(Request $request, Api $api): RedirectResponse
    {
        $ids = $request->validate([
            'budget_ids' => ['required', 'array', 'min:1'],
            'budget_ids.*' => ['integer'],
        ], ['budget_ids.required' => 'Pick at least one budget.'])['budget_ids'];

        $api->ok($api->put('/subscription/budgets', ['budget_ids' => array_map('intval', $ids)]));

        $request->session()->forget('budgets_cache');

        return back()->with('status', 'Saved. Everyone in those budgets has Premium.');
    }
}
