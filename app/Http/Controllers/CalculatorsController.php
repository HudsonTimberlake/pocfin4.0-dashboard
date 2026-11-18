<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W16 Calculators (version 2): "What would it take?" Retirement, Saving and growth, Home loan and
 * Car loan at full width. The maths runs in the browser (resources/js/shared/calculators.ts, the
 * app's own); the server only keeps the saved inputs, shared with the budget and the app. Free.
 */
class CalculatorsController extends Controller
{
    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    public function show(Request $request): Response
    {
        // One call, to the dashboard's own endpoint (API: Dashboard/CalculatorsPageController).
        $page = $this->api->json($this->path('calculators'));

        return Inertia::render('Calculators', [
            'saved' => $page['calculations'] ?? [],
            'prefill' => $page['prefill'] ?? ['investments' => null, 'spending_now' => null],
            'calc' => in_array($request->query('calc'), ['retirement', 'growth', 'home_loan', 'car_loan'], true) ? $request->query('calc') : null,
            'open' => $request->integer('open') ?: null,
        ]);
    }

    private function rules(bool $create): array
    {
        $req = $create ? 'required' : 'sometimes';

        return [
            'kind' => $create ? ['required', Rule::in(['retirement', 'growth', 'home_loan', 'car_loan'])] : ['prohibited'],
            'name' => [$req, 'string', 'max:80'],
            'inputs' => [$req, 'array', 'max:40'],
        ];
    }

    /** The inputs as sent: the validator would drop keys it has no rule for. */
    private function body(Request $request, bool $create): array
    {
        $data = $request->validate($this->rules($create));
        if ($request->has('inputs')) {
            $data['inputs'] = $request->input('inputs');
        }

        return $data;
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($this->api->ok($this->api->post($this->path('calculations'), $this->body($request, true)))->json(), 201);
    }

    public function update(Request $request, int $calculation): JsonResponse
    {
        return response()->json($this->api->ok($this->api->patch($this->path("calculations/$calculation"), $this->body($request, false)))->json());
    }

    public function destroy(int $calculation): JsonResponse
    {
        $this->api->ok($this->api->delete($this->path("calculations/$calculation")));

        return response()->json(null, 204);
    }
}
