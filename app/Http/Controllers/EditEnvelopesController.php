<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W9 Edit envelopes (version 2): "Does my plan fit my income?" Monthly income against what's
 * budgeted each month first, then sort, plans and one table of names, kinds and amounts, with one
 * Save (all or nothing on the API's side).
 */
class EditEnvelopesController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(): Response
    {
        // One call, to the dashboard's own endpoint (API: Dashboard/EditEnvelopesController).
        $page = $this->api->json($this->path('edit-envelopes'));

        return Inertia::render('EditEnvelopes', [
            'monthly_income' => $page['monthly_income'] ?? null,
            'can_change_income' => (bool) ($page['can_change_income'] ?? false),
            'envelopes' => array_values(array_filter($page['envelopes'] ?? [], fn ($e) => ! ($e['archived'] ?? false))),
            'plans' => $page['plans'] ?? [],
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'create' => ['sometimes', 'array', 'max:50'],
            'create.*.name' => ['required', 'string', 'max:100'],
            'create.*.budgeted_amount' => ['required', 'string', 'max:20'],
            'create.*.kind' => ['required', 'in:everyday,saving_up'],
            'update' => ['sometimes', 'array', 'max:200'],
            'update.*.id' => ['required', 'integer'],
            'update.*.name' => ['sometimes', 'required', 'string', 'max:100'],
            'update.*.budgeted_amount' => ['sometimes', 'string', 'max:20'],
            'update.*.kind' => ['sometimes', 'in:everyday,saving_up'],
            'order' => ['sometimes', 'array', 'max:500'],
            'order.*' => ['string', 'regex:/^(new:)?\d+$/'],
            'monthly_income' => ['sometimes', 'nullable', 'string', 'max:20'],
        ], ['*.*.name.required' => 'Give it a name.'], [
            'create.*.name' => 'name', 'update.*.name' => 'name',
            'create.*.budgeted_amount' => 'monthly amount', 'update.*.budgeted_amount' => 'monthly amount',
            'create.*.kind' => 'kind', 'update.*.kind' => 'kind', 'monthly_income' => 'monthly income',
        ]);
        $this->api->ok($this->api->post($this->path('edit-envelopes'), $data));

        return back()->with('saved', 'envelopes');
    }

    public function storePlan(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'amounts' => ['required', 'array', 'max:200'],
            'amounts.*' => ['string', 'max:20'],
        ]);
        $this->api->ok($this->api->post($this->path('envelope-plans'), $data));

        return back()->with('saved', 'plan');
    }

    public function destroyPlan(int $plan): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->path("envelope-plans/$plan")));

        return back()->with('saved', 'plan-deleted');
    }
}
