<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The Add panel and in-place edits (version 2, W3). Each sends the form on to its dashboard-only
 * API path, which uses the app's own rules; the API's 422 comes back as the form's errors. After a
 * save the page reloads its figures (back), so totals count to their new values.
 */
class MoneyController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    /** What the Add panel offers, fetched when it opens (envelopes, accounts, most used). */
    public function options(): JsonResponse
    {
        return response()->json($this->api->json($this->path('add')));
    }

    public function storeExpense(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'envelope_id' => ['required', 'integer'],
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
            'refund' => ['sometimes', 'boolean'],
            'receipt' => ['nullable', 'file', 'max:5120'],
        ], ['receipt.max' => 'Choose a photo under 5 MB.']);
        $file = $request->file('receipt');
        unset($data['receipt']);
        $id = $this->api->ok($this->api->post($this->path('expenses'), $data))->json('id');
        $saved = $data['refund'] ?? false ? 'refund' : 'expense';

        // The photo goes on once the expense exists. If it's refused, the expense stays saved and
        // the toast says why (receipts need Premium, or the photo isn't one we take).
        if ($file && $id) {
            $r = $this->api->upload($this->path("expenses/$id/receipt"), 'receipt', $file);
            if (! $r->successful()) {
                return back()->with('saved', $saved)->with('status', 'Saved, but the receipt didn’t attach: '.($r->json('errors.receipt.0') ?? $r->json('message') ?? 'try again from History.'));
            }
        }

        return back()->with('saved', $saved);
    }

    public function updateExpense(Request $request, int $expense): RedirectResponse
    {
        $data = $request->validate([
            'envelope_id' => ['sometimes', 'integer'],
            'amount' => ['sometimes', 'string', 'max:20'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'note' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $this->api->ok($this->api->patch($this->path("expenses/$expense"), $data));

        return back()->with('saved', 'changed');
    }

    /** Sent by the page once a delete's Undo time is up (a plain request, so it also works while leaving). */
    public function destroyExpense(int $expense): Response
    {
        $this->api->ok($this->api->delete($this->path("expenses/$expense")));

        return response()->noContent();
    }

    public function storeIncome(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $this->api->ok($this->api->post($this->path('deposits'), $data));

        return back()->with('saved', 'income');
    }

    public function storeMove(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_envelope_id' => ['nullable', 'integer'],
            'from_account_id' => ['nullable', 'integer'],
            'to_envelope_id' => ['nullable', 'integer'],
            'to_account_id' => ['nullable', 'integer'],
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $this->api->ok($this->api->post($this->path('transfers'), array_filter($data, fn ($v) => $v !== null)));

        return back()->with('saved', 'move');
    }

    /** Spending from a savings or holding account. */
    public function storeAccountExpense(Request $request, int $account): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $this->api->ok($this->api->post($this->path("accounts/$account/transactions"), ['type' => 'expense', ...$data]), ['amount' => 'amount']);

        return back()->with('saved', 'expense');
    }
}
