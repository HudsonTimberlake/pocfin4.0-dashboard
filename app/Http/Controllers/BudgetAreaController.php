<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W17 Notes, W17b Members and invites, W17c Budget settings (version 2). Each page makes one call
 * to its own dashboard endpoint; changes are small JSON calls so the page stays put. The app's own
 * rules decide who may do what (only the author changes a note; only the owner invites, removes,
 * hands over, renames or deletes).
 */
class BudgetAreaController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest = ''): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().($rest === '' ? '' : '/'.$rest);
    }

    /** A 403 from the API (not the owner, not the author) becomes one message, not the error page. */
    private function ok($response)
    {
        if ($response->status() === 403) {
            throw ValidationException::withMessages(['form' => [$response->json('message') ?: 'You can’t do that here.']]);
        }

        return $this->api->ok($response);
    }

    public function notes(): Response
    {
        $page = $this->api->json($this->path('notes'));

        return Inertia::render('Notes', ['notes' => $page['notes'] ?? [], 'cycle' => $page['cycle'] ?? null]);
    }

    public function members(): Response
    {
        $page = $this->api->json($this->path('members'));

        return Inertia::render('Members', [
            'me' => $page['me'] ?? 0,
            'isOwner' => $page['is_owner'] ?? false,
            'members' => $page['members'] ?? [],
            'invitations' => $page['invitations'] ?? [],
        ]);
    }

    public function settings(): Response
    {
        return Inertia::render('BudgetSettings', ['budget' => $this->api->json($this->path('settings'))]);
    }

    public function storeNote(Request $request): JsonResponse
    {
        $data = $request->validate($this->noteRules(true));

        return response()->json($this->ok($this->api->post($this->path('notes'), $data))->json(), 201);
    }

    public function updateNote(Request $request, int $note): JsonResponse
    {
        return response()->json($this->ok($this->api->patch($this->path("notes/$note"), $request->validate($this->noteRules(false))))->json());
    }

    public function destroyNote(int $note): JsonResponse
    {
        $this->ok($this->api->delete($this->path("notes/$note")));

        return response()->json(null, 204);
    }

    private function noteRules(bool $create): array
    {
        $req = $create ? 'required' : 'sometimes';

        return [
            'body' => [$req, 'string', 'max:2000'],
            'shared' => ['sometimes', 'boolean'],
            'this_cycle' => ['sometimes', 'boolean'],
            'remind_at' => ['sometimes', 'nullable', 'date'],
        ];
    }

    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'string', 'email', 'max:255']]);

        return response()->json($this->ok($this->api->post($this->path('invitations'), $data))->json(), 201);
    }

    public function cancelInvite(int $invitation): JsonResponse
    {
        $this->ok($this->api->delete($this->path("invitations/$invitation")));

        return response()->json(null, 204);
    }

    public function removeMember(int $member): JsonResponse
    {
        $this->ok($this->api->delete($this->path("members/$member")));

        return response()->json(null, 204);
    }

    public function makeOwner(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer']]);
        $this->ok($this->api->put($this->path('owner'), $data));

        return response()->json(null, 204);
    }

    public function leave(): JsonResponse
    {
        $this->ok($this->api->post($this->path('leave')));
        $this->forgetBudget();

        return response()->json(['to' => '/']);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['sometimes', 'string', 'max:100'], 'cycle_start_day' => ['sometimes', 'integer', 'between:1,28'], 'currency' => ['sometimes', 'string', 'size:3']]);
        $budget = $this->ok($this->api->patch($this->path(), $data))->json();
        session()->forget('budgets_cache');

        return response()->json($budget);
    }

    public function destroyBudget(): JsonResponse
    {
        $this->ok($this->api->delete($this->path()));
        $this->forgetBudget();

        return response()->json(['to' => '/']);
    }

    /** The budget is gone for this person: the next page picks another. */
    private function forgetBudget(): void
    {
        session()->forget(['budgets_cache', 'budget_id']);
    }
}
