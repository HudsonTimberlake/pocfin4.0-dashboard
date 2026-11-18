<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W13 Goals (version 2): "Am I keeping my habits?" How many are on track this month first, then
 * goal cards; one opens beside them (`?goal=`), and New goal (W13b) too. Goals are free.
 */
class GoalsController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(Request $request): Response
    {
        // One call, to the dashboard's own endpoint (API: Dashboard/GoalsPageController).
        $page = $this->api->json($this->path('goals'), array_filter(['goal' => $request->integer('goal') ?: null]));

        return Inertia::render('Goals', [
            'goals' => $page['goals'] ?? [],
            'selected' => $page['selected'] ?? null,
            'accounts' => array_map(fn (array $a) => ['id' => $a['id'], 'name' => $a['name'], 'type' => $a['type']], $page['accounts'] ?? []),
            'purposes' => array_map(fn (array $p) => ['id' => $p['id'], 'name' => $p['name']], $page['purposes'] ?? []),
            'cycle' => $page['cycle'] ?? null,
            // From Calculators' Make this a goal: New goal opens, filled in from this browser tab.
            'start_new' => $request->boolean('new'),
        ]);
    }

    private const FIELDS = [
        'name' => ['sometimes', 'string', 'max:100'],
        'kind' => ['sometimes', 'in:target,habit,yearly,value'],
        'account_id' => ['sometimes', 'nullable', 'integer'],
        'purpose_id' => ['sometimes', 'nullable', 'integer'],
        'target_amount' => ['sometimes', 'nullable', 'string', 'max:20'],
        'amount_per_cycle' => ['sometimes', 'nullable', 'string', 'max:20'],
        'target_month' => ['sometimes', 'nullable', 'date_format:Y-m'],
        'starts_on' => ['sometimes', 'date_format:Y-m-d'],
        'remind_on_payday' => ['sometimes', 'boolean'],
        // A value goal's plan, as the Retirement calculator hands it over ("Make this a goal").
        'raise_mode' => ['sometimes', 'nullable', 'in:percent,amount'],
        'raise_value' => ['sometimes', 'nullable', 'string', 'max:20'],
        'growth_pct' => ['sometimes', 'nullable', 'string', 'max:10'],
        'spread_pct' => ['sometimes', 'nullable', 'string', 'max:10'],
        'inflation_pct' => ['sometimes', 'nullable', 'string', 'max:10'],
        'age' => ['sometimes', 'nullable', 'integer', 'between:0,120'],
        'retire_age' => ['sometimes', 'nullable', 'integer', 'between:0,120'],
    ];

    public function store(Request $request): RedirectResponse
    {
        $data = array_filter($request->validate(self::FIELDS), fn ($v) => $v !== null);
        $id = $this->api->ok($this->api->post($this->path('goals'), $data))->json('id');

        return redirect()->route('goals', ['goal' => $id])->with('saved', 'goal');
    }

    public function update(Request $request, int $goal): RedirectResponse
    {
        $this->api->ok($this->api->put($this->path("goals/$goal"), $request->validate(self::FIELDS)));

        return back()->with('saved', 'goal');
    }

    public function destroy(int $goal): RedirectResponse
    {
        $this->api->ok($this->api->delete($this->path("goals/$goal")));

        return redirect()->route('goals')->with('saved', 'goal-deleted');
    }

    /** Finish, Decide later (snooze) or the yearly review done. Finish may say a value goal got there. */
    public function act(Request $request, int $goal, string $action): RedirectResponse
    {
        $data = $request->validate(['reached' => ['sometimes', 'boolean']]);
        $this->api->ok($this->api->post($this->path("goals/$goal/$action"), $action === 'finish' ? $data : []));

        return back()->with('saved', $action);
    }
}
