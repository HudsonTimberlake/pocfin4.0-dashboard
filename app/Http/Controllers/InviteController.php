<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** D9 Invite friends: the code and link, who joined, and which budget gets the free months. */
class InviteController extends Controller
{
    public function show(Api $api, Shell $shell): Response
    {
        return Inertia::render('Invite', [
            'referrals' => $api->json('/referrals'),
            'budgets' => array_map(fn ($b) => ['id' => $b['id'], 'name' => $b['name']], $shell->budgets()),
        ]);
    }

    public function budget(Request $request, Api $api): RedirectResponse
    {
        $id = $request->validate(['budget_id' => ['required', 'integer']])['budget_id'];
        $api->ok($api->put('/referrals/budget', ['budget_id' => (int) $id]));

        return back()->with('status', 'Saved.');
    }
}
