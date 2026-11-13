<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\View\View;

/** D4 History: Spent, Income and Moved, searched on the server, 25 a page. */
class HistoryController extends Controller
{
    private const PATHS = ['spent' => 'expenses', 'income' => 'deposits', 'moved' => 'transfers'];

    public function show(Request $request, Api $api, Shell $shell): View
    {
        $b = $shell->budgetId();
        $tab = array_key_exists($request->query('tab'), self::PATHS) ? $request->query('tab') : 'spent';
        $filters = session('history_filters', []);

        $query = array_filter([
            'q' => $filters['q'] ?? null,
            'from' => $filters['from'] ?? null,
            'to' => $filters['to'] ?? null,
            'envelope_id' => $tab !== 'income' ? ($filters['envelope_id'] ?? null) : null,
            'per_page' => 25,
            'page' => max(1, (int) $request->query('page', 1)),
        ]);

        // One call, to the dashboard's own endpoint (API: Dashboard/HistoryPageController).
        $data = $api->json("/dashboard/budgets/$b/history", ['tab' => $tab, ...$query]);

        return view('pages.history', [
            'tab' => $tab,
            'filters' => $filters,
            'list' => $data['list'] ?? ['data' => []],
            'envelopes' => collect($data['envelopes'] ?? [])->keyBy('id')->all(),
            'accounts' => collect($data['accounts'] ?? [])->keyBy('id')->all(),
            'members' => collect($data['members'] ?? [])->keyBy('id')->all(),
        ]);
    }

    public function filter(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'envelope_id' => ['nullable', 'integer'],
            'tab' => ['nullable', 'in:spent,income,moved'],
        ]);

        $request->session()->put('history_filters', $request->boolean('clear') ? [] : array_filter(
            collect($data)->except('tab')->all(), fn ($v) => $v !== null && $v !== ''
        ));

        return redirect()->route('history', ['tab' => $data['tab'] ?? 'spent']);
    }

    /** Streams a receipt photo from the API, so the browser never needs the API token. */
    public function receipt(Api $api, Shell $shell, int $expense): Response
    {
        $response = $api->get("/budgets/{$shell->budgetId()}/expenses/$expense/receipt");
        abort_unless($response->successful(), 404);

        return response($response->body(), 200, [
            'Content-Type' => $response->header('Content-Type') ?: 'image/jpeg',
            'Content-Disposition' => 'inline',
        ]);
    }
}
