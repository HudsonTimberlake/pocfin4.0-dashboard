<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\Client\Response as ClientResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * W10 History (version 2): "What happened, and can I find it?" Spent, Income and Moved, searched
 * on the server, 50 at a time as you scroll. Search words and filters are posted and kept in the
 * session, never in the address. Changes and deletes are small JSON calls, so the rows already
 * loaded stay where they are.
 */
class HistoryController extends Controller
{
    private const TABS = ['spent', 'income', 'moved'];

    public function __construct(private Api $api, private Shell $shell) {}

    private function path(string $rest): string
    {
        return '/dashboard/budgets/'.$this->shell->budgetId().'/'.$rest;
    }

    private function tab(Request $request): string
    {
        return in_array($request->query('tab'), self::TABS, true) ? $request->query('tab') : 'spent';
    }

    /** The filters kept in the session, as the API takes them. */
    private function query(string $tab): array
    {
        $f = session('history_filters', []);

        return array_filter([
            'q' => $f['q'] ?? null,
            'from' => $f['from'] ?? null,
            'to' => $f['to'] ?? null,
            'envelope_id' => $tab === 'spent' ? ($f['envelope_id'] ?? null) : null,
            'order' => $f['order'] ?? null,
        ]);
    }

    public function show(Request $request): Response
    {
        $tab = $this->tab($request);
        // One call, to the dashboard's own endpoint (API: Dashboard/HistoryPageController).
        $data = $this->api->json($this->path('history'), ['tab' => $tab, ...$this->query($tab), 'per_page' => 50, 'page' => 1]);
        $name = fn (array $x) => ['id' => $x['id'], 'name' => $x['name']];

        return Inertia::render('History', [
            'tab' => $tab,
            'filters' => session('history_filters', []) + ['order' => 'newest'],
            'list' => $this->list($data['list'] ?? []),
            'envelopes' => array_map(fn ($e) => [...$name($e), 'archived' => $e['archived'] ?? false, 'icon' => $e['icon'] ?? null], $data['envelopes'] ?? []),
            'accounts' => array_map(fn ($a) => [...$name($a), 'type' => $a['type']], $data['accounts'] ?? []),
            'members' => array_map($name, $data['members'] ?? []),
            'cycle_start_day' => (int) ($this->shell->budget()['cycle_start_day'] ?? 1),
            'premium' => (bool) ($this->shell->budget()['premium']['active'] ?? false),
        ]);
    }

    /** The next 50 as you scroll (the same dashboard endpoint, another page). */
    public function rows(Request $request): JsonResponse
    {
        $tab = $this->tab($request);
        $page = max(2, min(1000, (int) $request->query('page', 2)));
        $data = $this->api->json($this->path('history'), ['tab' => $tab, ...$this->query($tab), 'per_page' => 50, 'page' => $page]);

        return response()->json($this->list($data['list'] ?? []));
    }

    private function list(array $list): array
    {
        return [
            'data' => $list['data'] ?? [],
            'page' => (int) ($list['current_page'] ?? 1),
            'last_page' => (int) ($list['last_page'] ?? 1),
            'total' => (int) ($list['total'] ?? 0),
            'unallocated' => $list['unallocated'] ?? null,
        ];
    }

    /**
     * The API's answer, or its refusal as a message: a 422 names the field; a 403 (receipts need
     * Premium, someone else's private account) becomes one message instead of the error page.
     */
    private function ok(ClientResponse $response): ClientResponse
    {
        if ($response->status() === 403) {
            throw ValidationException::withMessages(['form' => [$response->json('message') ?: 'You can’t change this one.']]);
        }

        return $this->api->ok($response);
    }

    public function filter(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'envelope_id' => ['nullable', 'integer'],
            'order' => ['nullable', 'in:newest,oldest'],
            'tab' => ['nullable', 'in:spent,income,moved'],
        ]);

        $request->session()->put('history_filters', $request->boolean('clear') ? [] : array_filter(
            collect($data)->except('tab')->all(), fn ($v) => $v !== null && $v !== '' && $v !== 'newest'
        ));

        return redirect()->route('history', ['tab' => $data['tab'] ?? 'spent']);
    }

    /** One row changed (Spent, Income or Moved). Answers the row as the API has it now. */
    public function update(Request $request, string $tab, int $id): JsonResponse
    {
        $rules = [
            'amount' => ['sometimes', 'string', 'max:20'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'note' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
        $rules += match ($tab) {
            'spent' => ['envelope_id' => ['sometimes', 'integer']],
            'moved' => ['from_envelope_id' => ['sometimes', 'integer'], 'from_account_id' => ['sometimes', 'integer'], 'to_envelope_id' => ['sometimes', 'integer'], 'to_account_id' => ['sometimes', 'integer']],
            default => [],
        };
        $data = $request->validate($rules);
        $path = ['spent' => 'expenses', 'income' => 'deposits', 'moved' => 'transfers'][$tab];

        return response()->json($this->ok($this->api->patch($this->path("$path/$id"), $data))->json());
    }

    /** Sent once Undo has passed: one row, or several of one tab (all or nothing). */
    public function destroy(Request $request, string $tab): HttpResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:100'], 'ids.*' => ['integer']])['ids'];
        $this->ok($this->api->post($this->path('history/bulk'), ['tab' => $tab, 'action' => 'delete', 'ids' => array_map('intval', $ids)]));

        return response()->noContent();
    }

    /** Several Spent rows into another envelope (all or nothing). */
    public function moveEnvelope(Request $request): HttpResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:100'], 'ids.*' => ['integer'], 'envelope_id' => ['required', 'integer']]);
        $this->ok($this->api->post($this->path('history/bulk'), ['tab' => 'spent', 'action' => 'envelope', 'ids' => array_map('intval', $data['ids']), 'envelope_id' => (int) $data['envelope_id']]));

        return response()->noContent();
    }

    public function storeReceipt(Request $request, int $expense): JsonResponse
    {
        $request->validate(['receipt' => ['required', 'file', 'max:5120']], ['receipt.max' => 'Choose a photo under 5 MB.']);
        $this->ok($this->api->upload($this->path("expenses/$expense/receipt"), 'receipt', $request->file('receipt')));

        return response()->json(['has_receipt' => true]);
    }

    public function destroyReceipt(int $expense): HttpResponse
    {
        $this->ok($this->api->delete($this->path("expenses/$expense/receipt")));

        return response()->noContent();
    }

    /** Download CSV: every row matching the filters (up to 5,000), with names, never ids. */
    public function export(Request $request): StreamedResponse
    {
        $tab = $this->tab($request);
        $data = $this->api->json($this->path('history/export'), ['tab' => $tab, ...$this->query($tab)]);
        $env = collect($data['envelopes'] ?? [])->pluck('name', 'id');
        $acc = collect($data['accounts'] ?? [])->pluck('name', 'id');
        $who = collect($data['members'] ?? [])->pluck('name', 'id');
        $place = fn ($x, $side) => $env[$x["{$side}_envelope_id"] ?? null] ?? $acc[$x["{$side}_account_id"] ?? null] ?? (($x["{$side}_private_account"] ?? false) ? 'Private account' : '');

        $head = match ($tab) {
            'spent' => ['Date', 'Note', 'Envelope', 'Refund', 'Amount', 'Recorded by'],
            'income' => ['Date', 'Note', 'Amount', 'Allocated', 'Still to allocate', 'Recorded by'],
            'moved' => ['Date', 'Note', 'From', 'To', 'Amount', 'Recorded by'],
        };
        $line = fn (array $x) => match ($tab) {
            'spent' => [$x['date'], $x['note'], $env[$x['envelope_id']] ?? '', $x['refund'] ? 'Yes' : 'No', ($x['refund'] ? '-' : '').$x['amount'], $who[$x['created_by']] ?? ''],
            'income' => [$x['date'], $x['note'], $x['amount'], $x['allocated'], $x['unallocated'], $who[$x['created_by']] ?? ''],
            'moved' => [$x['date'], $x['note'], $place($x, 'from'), $place($x, 'to'), $x['amount'], $who[$x['created_by']] ?? ''],
        };
        // Text starting with = + - @ (or a tab or return) would run as a formula in a spreadsheet; a
        // leading ' keeps it text. Amounts ("-349.00") are numbers and stay as they are.
        $safe = fn ($v) => is_string($v) && $v !== '' && ! is_numeric($v) && str_contains("=+-@\t\r", $v[0]) ? "'".$v : (string) $v;

        return response()->streamDownload(function () use ($data, $head, $line, $safe) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $head);
            foreach ($data['rows'] ?? [] as $x) {
                fputcsv($out, array_map($safe, $line($x)));
            }
            fclose($out);
        }, "pocfin-$tab-".now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Streams a receipt photo from the API, so the browser never needs the API token. */
    public function receipt(int $expense): HttpResponse
    {
        $response = $this->api->get("/budgets/{$this->shell->budgetId()}/expenses/$expense/receipt");
        abort_unless($response->successful(), 404);

        return response($response->body(), 200, [
            'Content-Type' => $response->header('Content-Type') ?: 'image/jpeg',
            'Content-Disposition' => 'inline',
        ]);
    }
}
