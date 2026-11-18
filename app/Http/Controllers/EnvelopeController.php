<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Budget page writes (version 2, W6/W7): a new envelope, inline and panel changes, the order after
 * a drag, and delete. Each goes to its dashboard-only API path, which uses the app's own rules; the
 * API's 422 comes back as the form's errors. After a save the page reloads its figures (back).
 */
class EnvelopeController extends Controller
{
    private const AMOUNT = ['string', 'max:20'];

    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:32'],
            'budgeted_amount' => ['sometimes', ...self::AMOUNT],
            'kind' => ['sometimes', 'in:everyday,saving_up'],
        ]);
        $this->api->ok($this->api->post($this->path('envelopes'), $data));

        return back()->with('saved', 'envelope');
    }

    public function update(Request $request, int $envelope): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:32'],
            'budgeted_amount' => ['sometimes', 'required', ...self::AMOUNT],
            'kind' => ['sometimes', 'required', 'in:everyday,saving_up'],
            'archived' => ['sometimes', 'boolean'],
        ]);
        $this->api->ok($this->api->patch($this->path("envelopes/$envelope"), $data));

        return back()->with('saved', 'changed');
    }

    /** Every envelope id in the budget (archived ones too), in the new order. */
    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:500'], 'ids.*' => ['required', 'integer']]);
        $this->api->ok($this->api->put($this->path('envelopes/order'), ['ids' => array_map('intval', $data['ids'])]));

        return back()->with('saved', 'order');
    }

    public function destroy(int $envelope): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->path("envelopes/$envelope")));

        return redirect()->route('budget')->with('saved', 'deleted');
    }
}
