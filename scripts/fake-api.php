<?php

/*
 * A stand-in for the PocFin API with the boards' sample "Our home" figures, so the dashboard can be
 * looked at locally without anyone's real account (any sign-in works). It remembers adds, changes
 * and deletes in a temp file, roughly the way the real API moves the figures, so saving can be
 * tried. Delete the file (or call /api/fake/reset) to start again. Never deployed (scripts/).
 *
 *   php -S 127.0.0.1:8030 scripts/fake-api.php
 */

$file = sys_get_temp_dir().'/pocfin-fake-api.json';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
header('Content-Type: application/json');

$c = fn (string $a): int => (int) round(((float) $a) * 100);
$s = fn (int $c): string => number_format($c / 100, 2, '.', '');
$day = fn (int $ago) => date('Y-m-d', strtotime("-$ago days"));

function fresh(callable $day): array
{
    $alloc = [1 => 600000, 2 => 100000, 3 => 150000, 4 => 100000, 5 => 850000, 6 => 100000, 7 => 60000, 8 => 50000, 9 => 50000, 10 => 100000];
    $env = fn ($id, $name, $bal, $target, $spent, $kind = 'everyday') => compact('id', 'name', 'kind') + ['balance' => $bal, 'target' => $target, 'spent' => $spent, 'alloc' => $alloc[$id], 'icon' => null, 'archived' => false, 'sort' => $id];

    return [
        'seq' => 100,
        'unallocated' => 125000,
        'fill_mode' => 'top_up',
        'income' => '22850.00',
        'plans' => [
            ['id' => 1, 'name' => 'Tight month', 'amounts' => ['1' => '5000.00', '2' => '400.00', '3' => '1600.00', '4' => '900.00', '5' => '8500.00', '6' => '1000.00', '7' => '0.00', '8' => '300.00', '9' => '500.00', '10' => '500.00'], 'updated_at' => date('c')],
            ['id' => 2, 'name' => 'December', 'amounts' => ['1' => '7000.00', '2' => '2000.00', '3' => '2400.00', '4' => '1000.00', '5' => '8500.00', '6' => '1000.00', '7' => '500.00', '8' => '500.00', '9' => '0.00', '10' => '0.00'], 'updated_at' => date('c')],
        ],
        'refunded' => 34900,
        'envelopes' => [
            $env(1, 'Groceries', 149135, 600000, 450865), $env(2, 'Eating out', -18040, 120000, 138040), $env(3, 'Petrol', 62000, 200000, 138000),
            $env(4, 'Electricity', 30000, 100000, 70000), $env(5, 'Rent', 0, 850000, 850000), $env(6, 'Phone and internet', 0, 100000, 100000),
            $env(7, 'Clothing', 95000, 100000, 5000), $env(8, 'Spare', 64000, 50000, 24000), $env(9, 'Car service', 159955, 80000, 0, 'saving_up'),
            $env(10, 'Christmas', 300000, 100000, 0, 'saving_up'),
        ],
        'accounts' => [
            ['id' => 11, 'name' => 'Emergency fund', 'type' => 'savings', 'balance' => 4230000, 'gain' => null],
            ['id' => 12, 'name' => 'Car licence and tax', 'type' => 'holding', 'balance' => 310000, 'gain' => null],
            ['id' => 13, 'name' => 'Long-term investments', 'type' => 'investment', 'balance' => 12912957, 'gain' => '12410.55', 'value' => 14154012],
            ['id' => 14, 'name' => 'Offshore portfolio', 'type' => 'investment', 'balance' => 5000000, 'gain' => '4600.00', 'value' => 5460000, 'currency' => 'USD', 'usd_rate' => '18.2000', 'rate_updated_at' => date('Y-m-01').'T08:00:00+02:00'],
        ],
        // Holdings: positions hold a value and what was put in, per purpose; values newest first.
        'holdings' => [
            ['id' => 21, 'account_id' => 13, 'name' => 'S&P 500 ETF', 'twr' => ['cycle' => '1.20', 'ytd' => '12.40', 'all' => '18.20'], 'pos' => [[5, 5345045, 4836000], [6, 3275995, 2964000]],
                'vals' => [[date('Y-m-01'), 8621040], [date('Y-m-01', strtotime('-1 month')), 8314010], [date('Y-m-01', strtotime('-2 months')), 8199055], [date('Y-m-01', strtotime('-3 months')), 8030400]]],
            ['id' => 22, 'account_id' => 13, 'name' => 'SA Top 40 ETF', 'twr' => ['cycle' => '0.80', 'ytd' => '7.10', 'all' => '9.30'], 'pos' => [[5, 2412062, 2263000], [7, 1478360, 1387000]],
                'vals' => [[date('Y-m-01'), 3890422], [date('Y-m-01', strtotime('-1 month')), 3810000], [date('Y-m-01', strtotime('-2 months')), 3762015]]],
            ['id' => 23, 'account_id' => 13, 'name' => 'Global bond fund', 'twr' => ['cycle' => '0.40', 'ytd' => '4.85', 'all' => '13.10'], 'pos' => [[6, 1642550, 1462957]],
                'vals' => [[date('Y-m-01'), 1642550], [date('Y-m-01', strtotime('-1 month')), 1634020]]],
            ['id' => 24, 'account_id' => 14, 'name' => 'MSCI World ETF', 'twr' => ['cycle' => '1.10', 'ytd' => '9.20', 'all' => '9.20'], 'pos' => [[5, 5460000, 5000000]],
                'vals' => [[date('Y-m-01'), 5460000], [date('Y-m-01', strtotime('-1 month')), 5300000]]],
        ],
        'purposes' => [5 => 'Retirement', 6 => 'House deposit', 7 => 'Travel'],
        'expenses' => [
            ['id' => 1, 'envelope_id' => 1, 'amount' => 84230, 'refund' => false, 'date' => $day(0), 'note' => 'Weekly shop', 'created_by' => 7],
            ['id' => 2, 'envelope_id' => 3, 'amount' => 70000, 'refund' => false, 'date' => $day(0), 'note' => 'Fuel', 'created_by' => 8],
            ['id' => 3, 'envelope_id' => 2, 'amount' => 46000, 'refund' => false, 'date' => $day(1), 'note' => 'Birthday dinner', 'created_by' => 8],
            ['id' => 4, 'envelope_id' => 1, 'amount' => 34900, 'refund' => true, 'date' => $day(2), 'note' => 'Returned a kettle', 'created_by' => 7],
            ['id' => 5, 'envelope_id' => 4, 'amount' => 50000, 'refund' => false, 'date' => $day(3), 'note' => 'Prepaid electricity', 'created_by' => 7],
            ['id' => 6, 'envelope_id' => 6, 'amount' => 100000, 'refund' => false, 'date' => $day(6), 'note' => 'Fibre', 'created_by' => 8],
            ['id' => 7, 'envelope_id' => 1, 'amount' => 61240, 'refund' => false, 'date' => $day(8), 'note' => 'Woolworths', 'created_by' => 8, 'receipt' => 1],
            ['id' => 8, 'envelope_id' => 2, 'amount' => 28540, 'refund' => false, 'date' => $day(8), 'note' => 'Uber Eats', 'created_by' => 8],
            ['id' => 9, 'envelope_id' => 3, 'amount' => 68000, 'refund' => false, 'date' => $day(9), 'note' => 'Shell', 'created_by' => 7],
            ['id' => 10, 'envelope_id' => 1, 'amount' => 124095, 'refund' => false, 'date' => $day(11), 'note' => 'Pick n Pay', 'created_by' => 7, 'receipt' => 1],
            ['id' => 11, 'envelope_id' => 5, 'amount' => 850000, 'refund' => false, 'date' => $day(12), 'note' => 'Rent', 'created_by' => 7],
        ],
        'deposits' => [
            ['id' => 40, 'amount' => 2285000, 'date' => date('Y-m-01'), 'note' => 'Salary', 'created_by' => 7],
            ['id' => 39, 'amount' => 31240, 'date' => date('Y-m-d', strtotime('first day of last month')), 'note' => 'Interest', 'created_by' => 7, 'allocated' => 31240],
            ['id' => 38, 'amount' => 50000, 'date' => date('Y-m-d', strtotime('-3 days')), 'note' => 'Gift from Gogo', 'created_by' => 8, 'allocated' => 0],
        ],
        'transfers' => [
            ['id' => 31, 'from_envelope_id' => 8, 'to_envelope_id' => 2, 'amount' => 20000, 'date' => $day(2), 'note' => 'Cover Eating out', 'created_by' => 7],
            ['id' => 32, 'from_envelope_id' => 10, 'to_account_id' => 13, 'to_holding_id' => 21, 'amount' => 150000, 'date' => date('Y-m-01'), 'note' => 'Monthly contribution', 'created_by' => 7],
            ['id' => 33, 'from_account_id' => 11, 'to_account_id' => 12, 'amount' => 50000, 'date' => date('Y-m-02'), 'note' => 'Car licence', 'created_by' => 8],
        ],
    ];
}

$state = is_file($file) ? json_decode(file_get_contents($file), true) : fresh($day);
$save = function () use (&$state, $file) { file_put_contents($file, json_encode($state)); };
$answer = function ($data, int $status = 200) { http_response_code($status); echo $status === 204 ? '' : json_encode($data); return true; };
$fail = fn (string $field, string $message) => $answer(['message' => $message, 'errors' => [$field => [$message]]], 422);

// An expense's effect on its envelope: spending takes money out, a refund puts it back.
$apply = function (array $x, int $sign) use (&$state) {
    foreach ($state['envelopes'] as &$e) {
        if ($e['id'] === $x['envelope_id']) {
            $e['balance'] += $sign * ($x['refund'] ? $x['amount'] : -$x['amount']);
            $e['spent'] += $sign * ($x['refund'] ? 0 : $x['amount']);
        }
    }
    if ($x['refund']) { $state['refunded'] += $sign * $x['amount']; }
};
$checkExpense = function (array $b) use (&$state, $c, $fail) {
    if (! in_array((int) ($b['envelope_id'] ?? 0), array_column($state['envelopes'], 'id'), true)) { return $fail('envelope_id', 'Choose an envelope in this budget.'); }
    if ($c($b['amount'] ?? '0') <= 0) { return $fail('amount', 'The amount must be more than R0.00.'); }
    return null;
};
$shapeExpense = fn (array $x) => [...$x, 'amount' => $s($x['amount']), 'has_receipt' => ! empty($x['receipt']), 'receipt_version' => empty($x['receipt']) ? null : (string) $x['receipt'], 'automatic' => false];

if ($path === '/api/fake/reset') { @unlink($file); return $answer(['reset' => true]); }

if (preg_match('#^/api/dashboard/budgets/(\d+)/expenses$#', $path) && $method === 'POST') {
    if ($r = $checkExpense($body)) { return $r; }
    $x = ['id' => ++$state['seq'], 'envelope_id' => (int) $body['envelope_id'], 'amount' => $c($body['amount']), 'refund' => (bool) ($body['refund'] ?? false), 'date' => $body['date'], 'note' => $body['note'] ?? null, 'created_by' => 7];
    $apply($x, 1);
    array_unshift($state['expenses'], $x);
    $save();
    return $answer($shapeExpense($x), 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/expenses/(\d+)$#', $path, $m)) {
    $i = array_search((int) $m[2], array_column($state['expenses'], 'id'), true);
    if ($i === false) { return $answer(['message' => 'Not found.'], 404); }
    $old = $state['expenses'][$i];
    $apply($old, -1);
    if ($method === 'DELETE') { array_splice($state['expenses'], $i, 1); $save(); return $answer(null, 204); }
    $new = [...$old, ...array_intersect_key($body, array_flip(['envelope_id', 'date', 'note']))];
    if (isset($body['amount'])) { $new['amount'] = $c($body['amount']); }
    if ($r = $checkExpense([...$body, 'envelope_id' => $new['envelope_id'], 'amount' => $s($new['amount'])])) { $apply($old, 1); return $r; }
    $apply($new, 1);
    $state['expenses'][$i] = $new;
    $save();
    return $answer($shapeExpense($new));
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/deposits$#', $path) && $method === 'POST') {
    if ($c($body['amount'] ?? '0') <= 0) { return $fail('amount', 'The amount must be more than R0.00.'); }
    $state['unallocated'] += $c($body['amount']);
    $save();
    return $answer(['id' => ++$state['seq'], 'amount' => $body['amount']], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/transfers$#', $path) && $method === 'POST') {
    if (empty($body['from_envelope_id']) && empty($body['from_account_id'])) { return $fail('from_envelope_id', 'Choose where the money comes from.'); }
    if (empty($body['to_envelope_id']) && empty($body['to_account_id'])) { return $fail('to_envelope_id', 'Choose where the money goes.'); }
    $amount = $c($body['amount'] ?? '0');
    if ($amount <= 0) { return $fail('amount', 'The amount must be more than R0.00.'); }
    foreach (['from' => -1, 'to' => 1] as $side => $sign) {
        foreach ($state['envelopes'] as &$e) { if ($e['id'] === (int) ($body["{$side}_envelope_id"] ?? 0)) { $e['balance'] += $sign * $amount; } }
        unset($e);
        foreach ($state['accounts'] as &$a) { if ($a['id'] === (int) ($body["{$side}_account_id"] ?? 0)) { $a['balance'] += $sign * $amount; } }
        unset($a);
    }
    $save();
    return $answer(['id' => ++$state['seq'], 'amount' => $body['amount']], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)/transactions$#', $path, $m) && $method === 'POST') {
    if ($c($body['amount'] ?? '0') <= 0) { return $fail('amount', 'The amount must be more than R0.00.'); }
    if (! empty($body['holding_id'])) {
        $k = array_search((int) $body['holding_id'], array_column($state['holdings'], 'id'), true);
        $h = &$state['holdings'][$k]; $amt = ($body['type'] === 'add' ? 1 : -1) * $c($body['amount']);
        $pi = array_search((int) $body['purpose_id'], array_column($h['pos'], 0), true);
        if ($amt < 0 && ($pi === false || -$amt > $h['pos'][$pi][1])) { return $fail('amount', 'That purpose doesn’t hold that much in this holding.'); }
        array_unshift($h['vals'], [$body['date'], $c($body['holding_value'])]);
        if ($pi === false) { $h['pos'][] = [(int) $body['purpose_id'], $amt, $amt]; } else { $h['pos'][$pi][1] += $amt; $h['pos'][$pi][2] += $amt; }
        unset($h);
    }
    foreach ($state['accounts'] as &$a) { if ($a['id'] === (int) $m[2] && empty($body['holding_id'])) { $a['balance'] += ($body['type'] === 'add' ? 1 : -1) * $c($body['amount'] ?? '0'); } }
    unset($a);
    if (! empty($body['holding_id'])) {
        foreach ($state['accounts'] as &$a) {
            if ($a['type'] !== 'investment') { continue; }
            $hs = array_filter($state['holdings'], fn ($h) => $h['account_id'] === $a['id']);
            $a['value'] = array_sum(array_map(fn ($h) => array_sum(array_column($h['pos'], 1)), $hs));
            $a['balance'] = array_sum(array_map(fn ($h) => array_sum(array_column($h['pos'], 2)), $hs));
            $a['gain'] = number_format(($a['value'] - $a['balance']) / 100, 2, '.', '');
        }
        unset($a);
    }
    $state['account_tx'][] = ['id' => ++$state['seq'], 'account_id' => (int) $m[2], 'type' => $body['type'], 'amount' => $body['amount'], 'date' => $body['date'], 'note' => $body['note'] ?? null, 'created_by' => 7];
    $save();
    return $answer(['id' => ++$state['seq'], 'amount' => $body['amount']], 201);
}

// Budget page writes (W6/W7): new envelope, change (name, icon, monthly, kind, archived), order, delete.
$amountOk = fn ($a) => is_string($a) && preg_match('/^\d{1,10}(\.\d{1,2})?$/', $a);
if (preg_match('#^/api/dashboard/budgets/(\d+)/envelopes$#', $path) && $method === 'POST') {
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    if (isset($body['budgeted_amount']) && ! $amountOk($body['budgeted_amount'])) { return $fail('budgeted_amount', 'The budgeted amount field format is invalid.'); }
    $id = ++$state['seq'];
    $e = ['id' => $id, 'name' => trim($body['name']), 'kind' => $body['kind'] ?? 'everyday', 'balance' => 0, 'target' => $c($body['budgeted_amount'] ?? '0'), 'spent' => 0, 'alloc' => 0, 'icon' => $body['icon'] ?? null, 'archived' => false, 'sort' => max(array_column($state['envelopes'], 'sort')) + 1];
    $state['envelopes'][] = $e;
    $save();
    return $answer(['id' => $id, 'name' => $e['name']], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/envelopes/order$#', $path) && $method === 'PUT') {
    $ids = array_map('intval', $body['ids'] ?? []);
    $all = array_column($state['envelopes'], 'id');
    $a = $ids; sort($a); sort($all);
    if ($a !== $all) { return $fail('ids', 'List every envelope in this budget exactly once.'); }
    foreach ($state['envelopes'] as &$e) { $e['sort'] = array_search($e['id'], $ids, true); }
    unset($e);
    $save();
    return $answer([]);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/envelopes/(\d+)$#', $path, $m)) {
    $i = array_search((int) $m[2], array_column($state['envelopes'], 'id'), true);
    if ($i === false) { return $answer(['message' => 'Not found.'], 404); }
    if ($method === 'DELETE') {
        if ($state['envelopes'][$i]['balance'] !== 0) { return $fail('envelope', 'Only an envelope with a zero balance can be deleted. Move its money out first, or archive it instead.'); }
        array_splice($state['envelopes'], $i, 1);
        $save();
        return $answer(null, 204);
    }
    if (array_key_exists('name', $body) && trim((string) $body['name']) === '') { return $fail('name', 'The name field is required.'); }
    if (array_key_exists('budgeted_amount', $body) && ! $amountOk($body['budgeted_amount'])) { return $fail('budgeted_amount', 'The budgeted amount field format is invalid.'); }
    $e = &$state['envelopes'][$i];
    foreach (['name', 'icon', 'kind', 'archived'] as $k) { if (array_key_exists($k, $body)) { $e[$k] = $body[$k]; } }
    if (isset($body['budgeted_amount'])) { $e['target'] = $c($body['budgeted_amount']); }
    unset($e);
    $save();
    return $answer(['id' => (int) $m[2]]);
}

// Allocate (W8): every staged line from the Salary, all or nothing, like the real API.
if (preg_match('#^/api/dashboard/budgets/(\d+)/deposits/(\d+)/allocations$#', $path) && $method === 'POST') {
    $left = $state['unallocated'];
    foreach (array_values($body['items'] ?? []) as $i => $item) {
        $a = $c($item['amount'] ?? '0');
        if ($a <= 0) { return $fail("items.$i.amount", 'Enter an amount greater than zero.'); }
        if ($a > $left) { return $fail("items.$i.amount", 'This income has '.$s($left).' left to allocate, but you asked for '.$s($a).'.'); }
        $left -= $a;
    }
    foreach ($body['items'] as $item) {
        $a = $c($item['amount']);
        foreach ($state['envelopes'] as &$e) { if ($e['id'] === (int) ($item['envelope_id'] ?? 0)) { $e['balance'] += $a; $e['alloc'] = ($e['alloc'] ?? 0) + $a; } }
        unset($e);
        foreach ($state['accounts'] as &$ac) { if ($ac['id'] === (int) ($item['account_id'] ?? 0)) { $ac['balance'] += $a; } }
        unset($ac);
        if (! empty($item['account_id']) && (int) $item['account_id'] === 11) { $state['goal_paid'] = true; }
    }
    $state['unallocated'] = $left;
    $save();
    return $answer(['deposit' => ['id' => 40, 'amount' => '22850.00', 'allocated' => $s(2285000 - $left), 'unallocated' => $s($left), 'date' => date('Y-m-01'), 'note' => 'Salary', 'created_by' => 7], 'saved' => count($body['items'])], 201);
}
if ($path === '/api/user' && $method === 'PATCH') {
    if (isset($body['fill_mode'])) { $state['fill_mode'] = $body['fill_mode']; $save(); }
    return $answer(['id' => 7, 'name' => 'Hudson', 'fill_mode' => $state['fill_mode']]);
}

// Edit envelopes (W9): one Save, all or nothing; plans.
if (preg_match('#^/api/dashboard/budgets/(\d+)/edit-envelopes$#', $path) && $method === 'POST') {
    foreach (['create', 'update'] as $part) {
        foreach (array_values($body[$part] ?? []) as $i => $item) {
            if (array_key_exists('name', $item) && trim((string) $item['name']) === '') { return $fail("$part.$i.name", 'The name field is required.'); }
            if (array_key_exists('budgeted_amount', $item) && ! $amountOk($item['budgeted_amount'])) { return $fail("$part.$i.budgeted_amount", 'The budgeted amount field format is invalid.'); }
        }
    }
    if (array_key_exists('monthly_income', $body) && $body['monthly_income'] !== null && ! $amountOk($body['monthly_income'])) { return $fail('monthly_income', 'The monthly income field format is invalid.'); }
    $created = [];
    foreach (array_values($body['create'] ?? []) as $i => $item) {
        $id = ++$state['seq'];
        $state['envelopes'][] = ['id' => $id, 'name' => trim($item['name']), 'kind' => $item['kind'] ?? 'everyday', 'balance' => 0, 'target' => $c($item['budgeted_amount'] ?? '0'), 'spent' => 0, 'alloc' => 0, 'icon' => null, 'archived' => false, 'sort' => 999 + $i];
        $created[$i] = $id;
    }
    foreach ($body['update'] ?? [] as $item) {
        foreach ($state['envelopes'] as &$e) {
            if ($e['id'] !== (int) $item['id']) { continue; }
            if (isset($item['name'])) { $e['name'] = trim($item['name']); }
            if (isset($item['kind'])) { $e['kind'] = $item['kind']; }
            if (isset($item['budgeted_amount'])) { $e['target'] = $c($item['budgeted_amount']); }
        }
        unset($e);
    }
    if (isset($body['order'])) {
        $ids = array_map(fn ($x) => str_starts_with($x, 'new:') ? $created[(int) substr($x, 4)] : (int) $x, $body['order']);
        foreach ($state['envelopes'] as &$e) { $at = array_search($e['id'], $ids, true); $e['sort'] = $at === false ? 1000 + $e['id'] : $at; }
        unset($e);
    }
    if (array_key_exists('monthly_income', $body)) { $state['income'] = $body['monthly_income']; }
    $save();
    return $answer(['created' => array_values($created)]);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/envelope-plans$#', $path) && $method === 'POST') {
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    $plan = ['id' => ++$state['seq'], 'name' => trim($body['name']), 'amounts' => $body['amounts'] ?? [], 'updated_at' => date('c')];
    array_unshift($state['plans'], $plan);
    $save();
    return $answer($plan, 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/envelope-plans/(\d+)$#', $path, $m) && $method === 'DELETE') {
    $state['plans'] = array_values(array_filter($state['plans'], fn ($p) => $p['id'] !== (int) $m[2]));
    $save();
    return $answer(null, 204);
}

// History (W10): rows changed, deleted (several at once, all or nothing), receipts, and the receipt photo.
$depAllocated = fn (array $d) => $d['id'] === 40 ? 2285000 - $state['unallocated'] : ($d['allocated'] ?? 0);
$shapeDeposit = fn (array $d) => ['id' => $d['id'], 'amount' => $s($d['amount']), 'allocated' => $s($depAllocated($d)), 'unallocated' => $s($d['amount'] - $depAllocated($d)), 'date' => $d['date'], 'note' => $d['note'], 'created_by' => $d['created_by']];
$shapeTransfer = fn (array $t) => ['id' => $t['id'], 'from_envelope_id' => $t['from_envelope_id'] ?? null, 'from_account_id' => $t['from_account_id'] ?? null, 'from_private_account' => false, 'from_holding_id' => null, 'from_purpose_id' => null, 'to_envelope_id' => $t['to_envelope_id'] ?? null, 'to_account_id' => $t['to_account_id'] ?? null, 'to_private_account' => false, 'to_holding_id' => $t['to_holding_id'] ?? null, 'to_purpose_id' => isset($t['to_holding_id']) ? 5 : null, 'amount' => $s($t['amount']), 'date' => $t['date'], 'note' => $t['note'], 'created_by' => $t['created_by'], 'automatic' => false];
$state['deposits'] ??= []; $state['transfers'] ??= [];
if (preg_match('#^/api/budgets/(\d+)/expenses/(\d+)/receipt$#', $path, $m) && $method === 'GET') {
    header('Content-Type: image/svg+xml');
    echo '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect width="300" height="420" fill="#fff"/><text x="30" y="60" font-family="sans-serif" font-size="22">Sample slip #'.(int) $m[2].'</text><rect x="30" y="90" width="240" height="8" fill="#ddd"/><rect x="30" y="120" width="200" height="8" fill="#ddd"/><rect x="30" y="150" width="220" height="8" fill="#ddd"/></svg>';
    return true;
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/expenses/(\d+)/receipt$#', $path, $m)) {
    foreach ($state['expenses'] as &$x) { if ($x['id'] === (int) $m[2]) { $x['receipt'] = $method === 'DELETE' ? 0 : time(); } }
    unset($x);
    $save();
    return $method === 'DELETE' ? $answer(null, 204) : $answer(['has_receipt' => true], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/deposits/(\d+)$#', $path, $m) && $method === 'PATCH') {
    foreach ($state['deposits'] as &$d) {
        if ($d['id'] !== (int) $m[2]) { continue; }
        if (isset($body['amount'])) { if ($c($body['amount']) < $depAllocated($d)) { return $fail('amount', 'Income can’t be less than what you have already allocated from it ('.$s($depAllocated($d)).').'); } $d['amount'] = $c($body['amount']); }
        foreach (['date', 'note'] as $k) { if (array_key_exists($k, $body)) { $d[$k] = $body[$k]; } }
        $out = $shapeDeposit($d);
    }
    unset($d);
    $save();
    return $answer($out ?? ['message' => 'Not found.'], isset($out) ? 200 : 404);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/transfers/(\d+)$#', $path, $m) && $method === 'PATCH') {
    foreach ($state['transfers'] as &$t) {
        if ($t['id'] !== (int) $m[2]) { continue; }
        if (isset($t['to_holding_id']) && array_diff(array_keys($body), ['note'])) { return $fail('amount', 'Money in a holding can only have its note changed.'); }
        if (isset($body['amount'])) { $t['amount'] = $c($body['amount']); }
        foreach (['date', 'note', 'from_envelope_id', 'from_account_id', 'to_envelope_id', 'to_account_id'] as $k) { if (array_key_exists($k, $body)) { $t[$k] = $body[$k]; } }
        foreach (['from', 'to'] as $sd) { if (isset($body["{$sd}_envelope_id"])) { unset($t["{$sd}_account_id"]); } if (isset($body["{$sd}_account_id"])) { unset($t["{$sd}_envelope_id"]); } }
        $out = $shapeTransfer($t);
    }
    unset($t);
    $save();
    return $answer($out ?? ['message' => 'Not found.'], isset($out) ? 200 : 404);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/history/bulk$#', $path) && $method === 'POST') {
    $key = ['spent' => 'expenses', 'income' => 'deposits', 'moved' => 'transfers'][$body['tab']];
    foreach (array_values($body['ids']) as $i => $id) {
        $row = current(array_filter($state[$key], fn ($r) => $r['id'] === (int) $id));
        if (! $row) { return $answer(['message' => 'Not found.'], 404); }
        if ($key === 'deposits' && $body['action'] === 'delete' && $depAllocated($row) > 0) { return $fail("ids.$i", 'This income has already been allocated to envelopes, so it can’t be deleted. Edit its amount instead.'); }
    }
    foreach ($body['ids'] as $id) {
        $i = array_search((int) $id, array_column($state[$key], 'id'), true);
        if ($body['action'] === 'envelope') { $apply($state[$key][$i], -1); $state[$key][$i]['envelope_id'] = (int) $body['envelope_id']; $apply($state[$key][$i], 1); continue; }
        if ($key === 'expenses') { $apply($state[$key][$i], -1); }
        array_splice($state[$key], $i, 1);
    }
    $save();
    return $answer(['done' => count($body['ids'])]);
}

// One investment (W12/W12b): holdings, values, purpose moves, the dollar rate, money in and out of a holding.
$state['holdings'] ??= [];
$hIndex = fn (int $id) => array_search($id, array_column($state['holdings'], 'id'), true);
$hValue = fn (array $h) => array_sum(array_map(fn ($p) => $p[1], $h['pos']));
$resum = function () use (&$state, $hValue) {
    foreach ($state['accounts'] as &$a) {
        if ($a['type'] !== 'investment') { continue; }
        $hs = array_filter($state['holdings'], fn ($h) => $h['account_id'] === $a['id']);
        $a['value'] = array_sum(array_map($hValue, $hs));
        $a['balance'] = array_sum(array_map(fn ($h) => array_sum(array_map(fn ($p) => $p[2], $h['pos'])), $hs));
        $a['gain'] = number_format(($a['value'] - $a['balance']) / 100, 2, '.', '');
    }
};
if (preg_match('#^/api/dashboard/budgets/(\d+)/purposes$#', $path) && $method === 'POST') {
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    $id = ++$state['seq'];
    $state['purposes'][$id] = trim($body['name']);
    $save();
    return $answer(['id' => $id, 'name' => trim($body['name'])], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)/rate$#', $path, $m) && $method === 'PUT') {
    $i = array_search((int) $m[2], array_column($state['accounts'], 'id'), true);
    if (($state['accounts'][$i]['currency'] ?? 'ZAR') !== 'USD') { return $fail('rate', 'Only a dollar account has a rate.'); }
    $r = (float) $body['rate']; $old = (float) $state['accounts'][$i]['usd_rate'];
    if ($r <= 0) { return $fail('rate', 'The rate must be more than 0.'); }
    foreach ($state['holdings'] as &$h) { if ($h['account_id'] === (int) $m[2]) { foreach ($h['pos'] as &$p) { $p[1] = (int) round($p[1] * $r / $old); } unset($p); array_unshift($h['vals'], [date('Y-m-d'), $hValue($h)]); } }
    unset($h);
    $state['accounts'][$i]['usd_rate'] = number_format($r, 4, '.', ''); $state['accounts'][$i]['rate_updated_at'] = date('c');
    $resum(); $save();
    return $answer(['id' => (int) $m[2], 'usd_rate' => $state['accounts'][$i]['usd_rate']]);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)/holdings$#', $path, $m) && $method === 'POST') {
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    $state['holdings'][] = ['id' => ++$state['seq'], 'account_id' => (int) $m[2], 'name' => trim($body['name']), 'twr' => ['cycle' => null, 'ytd' => null, 'all' => null], 'pos' => [], 'vals' => []];
    $save();
    return $answer(['id' => $state['seq'], 'name' => trim($body['name'])], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)/valuations$#', $path, $m) && $method === 'POST') {
    foreach (array_values($body['values'] ?? []) as $i => $line) { if (! $amountOk($line['value'] ?? '')) { return $fail("values.$i.value", 'The value field format is invalid.'); } }
    foreach ($body['values'] as $line) {
        $k = $hIndex((int) $line['holding_id']); $h = &$state['holdings'][$k]; $old = $hValue($h); $new = $c($line['value']);
        foreach ($h['pos'] as &$p) { $p[1] = $old ? (int) round($p[1] * $new / $old) : 0; } unset($p);
        array_unshift($h['vals'], [$body['date'], $new]); unset($h);
    }
    $resum(); $save();
    return $answer(['saved' => count($body['values'])], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)/holdings/(\d+)(/valuations/(\d+)|/purpose-moves)?$#', $path, $m) && in_array($method, ['PATCH', 'DELETE', 'POST'], true)) {
    $k = $hIndex((int) $m[3]);
    if ($k === false) { return $answer(['message' => 'Not found.'], 404); }
    $h = &$state['holdings'][$k];
    if (($m[4] ?? '') === '/purpose-moves') {
        $amt = $c($body['amount'] ?? '0');
        $from = array_search((int) $body['from_purpose_id'], array_column($h['pos'], 0), true);
        if ($from === false || $amt <= 0 || $amt > $h['pos'][$from][1]) { return $fail('amount', 'That purpose doesn’t hold that much in this holding.'); }
        $putShare = (int) round($h['pos'][$from][2] * $amt / $h['pos'][$from][1]);
        $h['pos'][$from][1] -= $amt; $h['pos'][$from][2] -= $putShare;
        $to = array_search((int) $body['to_purpose_id'], array_column($h['pos'], 0), true);
        if ($to === false) { $h['pos'][] = [(int) $body['to_purpose_id'], $amt, $putShare]; } else { $h['pos'][$to][1] += $amt; $h['pos'][$to][2] += $putShare; }
        array_unshift($h['vals'], [$body['date'], $hValue($h)]);
        unset($h); $save();
        return $answer(['moved' => true]);
    }
    if (! empty($m[5])) { array_shift($h['vals']); unset($h); $save(); return $answer(null, 204); }
    if ($method === 'DELETE') { unset($h); array_splice($state['holdings'], $k, 1); $resum(); $save(); return $answer(null, 204); }
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    $h['name'] = trim($body['name']); unset($h); $save();
    return $answer(['id' => (int) $m[3], 'name' => trim($body['name'])]);
}

// Accounts (W11): new, renamed or shared, closed.
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts$#', $path) && $method === 'POST') {
    if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
    if (($body['currency'] ?? 'ZAR') === 'USD' && ($body['type'] ?? '') !== 'investment') { return $fail('currency', 'Only an investment account can be in dollars.'); }
    if (($body['currency'] ?? 'ZAR') === 'USD' && ! preg_match('/^\d{1,6}(\.\d{1,4})?$/', (string) ($body['usd_rate'] ?? ''))) { return $fail('usd_rate', 'The usd rate field is required when currency is USD.'); }
    $a = ['id' => ++$state['seq'], 'name' => trim($body['name']), 'type' => $body['type'], 'balance' => 0, 'gain' => $body['type'] === 'investment' ? '0.00' : null, 'visibility' => $body['visibility'] ?? 'shared', 'currency' => $body['currency'] ?? 'ZAR'] + ($body['type'] === 'investment' ? ['value' => 0] : []);
    $state['accounts'][] = $a;
    $save();
    return $answer(['id' => $a['id'], 'name' => $a['name'], 'type' => $a['type']], 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts/(\d+)$#', $path, $m) && in_array($method, ['PATCH', 'DELETE'], true)) {
    $i = array_search((int) $m[2], array_column($state['accounts'], 'id'), true);
    if ($i === false) { return $answer(['message' => 'Not found.'], 404); }
    if ($method === 'DELETE') { array_splice($state['accounts'], $i, 1); $save(); return $answer(null, 204); }
    if (array_key_exists('name', $body) && trim((string) $body['name']) === '') { return $fail('name', 'The name field is required.'); }
    foreach (['name', 'visibility'] as $k) { if (isset($body[$k])) { $state['accounts'][$i][$k] = $body[$k]; } }
    $save();
    return $answer(['id' => (int) $m[2]]);
}

usort($state['envelopes'], fn ($a, $b) => ($a['sort'] ?? $a['id']) <=> ($b['sort'] ?? $b['id']));
$envelopes = array_map(fn ($e) => ['id' => $e['id'], 'name' => $e['name'], 'icon' => $e['icon'] ?? null, 'budgeted_amount' => $s($e['target']), 'kind' => $e['kind'], 'balance' => $s($e['balance']), 'sort_order' => $e['sort'] ?? $e['id'], 'archived' => (bool) ($e['archived'] ?? false), 'built_up_snoozed_through' => null], $state['envelopes']);
$left = array_sum(array_column($state['envelopes'], 'balance'));
$spent = array_sum(array_column($state['envelopes'], 'spent'));
$byId = array_column($state['envelopes'], null, 'id');
$top = array_values(array_filter($state['envelopes'], fn ($e) => $e['spent'] > 0 && $e['name'] !== 'Rent' && $e['name'] !== 'Phone and internet'));
usort($top, fn ($a, $b) => $b['spent'] <=> $a['spent']);
$accounts = array_map(fn ($a) => ['id' => $a['id'], 'name' => $a['name'], 'type' => $a['type'], 'visibility' => $a['visibility'] ?? ($a['id'] === 12 ? 'private' : 'shared'), 'created_by' => 7, 'currency' => $a['currency'] ?? 'ZAR', 'usd_rate' => $a['usd_rate'] ?? null, 'rate_updated_at' => $a['rate_updated_at'] ?? null, 'simple_return' => $a['type'] === 'investment' && $a['balance'] ? number_format(($a['value'] - $a['balance']) / $a['balance'] * 100, 2, '.', '') : null, 'balance' => $s($a['balance']), 'value' => isset($a['value']) ? $s($a['value']) : null, 'gain' => $a['gain']], $state['accounts']);
$total = array_sum(array_map(fn ($a) => $a['value'] ?? $a['balance'], $state['accounts']));

$overview = [
    'summary' => [
        'cycle' => ['start' => date('Y-m-01'), 'end' => date('Y-m-t'), 'start_day' => 1],
        'spent' => $s($spent), 'refunded' => $s($state['refunded']), 'allocated' => '21600.00', 'left_to_spend' => $s($left), 'unallocated' => $s($state['unallocated']),
        'accounts' => ['savings' => $s($state['accounts'][0]['balance']), 'holding' => $s($state['accounts'][1]['balance']), 'investments' => '141540.12', 'total' => $s($total)],
        'total_tracked' => $s($total + $left + $state['unallocated']),
        'overspent' => array_values(array_map(fn ($e) => ['envelope_id' => $e['id'], 'name' => $e['name'], 'amount' => $s(-$e['balance'])], array_filter($state['envelopes'], fn ($e) => $e['balance'] < 0))),
        'top_categories' => array_map(fn ($e) => ['envelope_id' => $e['id'], 'account_id' => null, 'name' => $e['name'], 'spent' => $s($e['spent']), 'refunded' => '0.00', 'balance' => $s($e['balance'])], array_slice($top, 0, 5)),
    ],
    'envelopes' => $envelopes,
    'accounts' => $accounts,
    'expenses' => array_map($shapeExpense, array_slice($state['expenses'], 0, 6)),
    'streak' => ['current' => 6, 'best' => 9, 'this_week_counted' => true, 'weeks' => array_map(fn ($st, $i) => ['start' => date('Y-m-d', strtotime('-'.(7 - $i).' weeks')), 'status' => $st], ['counted', 'counted', 'rest', 'counted', 'counted', 'counted', 'counted', 'current'], range(0, 7))],
    'left_from' => $state['unallocated'] > 0 ? ['id' => 40, 'amount' => '22850.00', 'allocated' => '21600.00', 'unallocated' => $s($state['unallocated']), 'date' => date('Y-m-01'), 'note' => 'Salary', 'created_by' => 7] : null,
    'members' => [['id' => 7, 'name' => 'Hudson', 'role' => 'owner'], ['id' => 8, 'name' => 'Thandi', 'role' => 'member']],
    'goals' => [['id' => 1, 'name' => 'Emergency fund', 'status' => 'active', 'state' => 'waiting'], ['id' => 2, 'name' => 'Tax-free top-up', 'status' => 'active', 'state' => 'on_track'], ['id' => 3, 'name' => 'Retire at 65', 'status' => 'active', 'state' => 'on_track'], ['id' => 4, 'name' => 'Car deposit', 'status' => 'active', 'state' => 'on_track']],
    'automatic_ready' => [['id' => 1, 'name' => 'Netflix', 'amount' => '199.00']],
];

if (preg_match('#^/api/dashboard/budgets/(\d+)/allocate$#', $path)) {
    $salary = ['id' => 40, 'amount' => '22850.00', 'allocated' => $s(2285000 - $state['unallocated']), 'unallocated' => $s($state['unallocated']), 'date' => date('Y-m-01'), 'note' => 'Salary', 'created_by' => 7];
    $asked = (int) ($_GET['deposit'] ?? 0);
    if ($asked && $asked !== 40) { return $answer(['message' => 'Not found.'], 404); }
    return $answer([
        'deposit' => $state['unallocated'] > 0 || $asked ? $salary : null,
        'waiting' => $state['unallocated'] > 0 ? [$salary] : [],
        'unallocated' => $s($state['unallocated']),
        'envelopes' => array_values(array_filter($envelopes, fn ($e) => ! $e['archived'])),
        'accounts' => $accounts,
        'goals' => empty($state['goal_paid']) ? [['id' => 1, 'name' => 'Emergency fund', 'status' => 'active', 'remind_on_payday' => true, 'account_id' => 11, 'purpose_id' => null, 'this_cycle' => ['start' => date('Y-m-01'), 'end' => date('Y-m-t'), 'needed' => '500.00', 'in' => '0.00', 'left' => '500.00', 'status' => 'waiting']]] : [],
        'fill_mode' => $state['fill_mode'] ?? 'top_up',
    ]);
}

if (preg_match('#^/api/dashboard/budgets/(\d+)/edit-envelopes$#', $path)) {
    return $answer(['monthly_income' => $state['income'] ?? '22850.00', 'can_change_income' => true, 'envelopes' => $envelopes, 'plans' => $state['plans'] ?? []]);
}

// Automatic (W14): the board's six payments with their runs; approving, running, skipping, editing.
$dd = fn (int $day, int $monthOffset = 0) => date('Y-m-d', mktime(0, 0, 0, (int) date('n') + $monthOffset, $day, (int) date('Y')));
$state['auto'] ??= [
    ['id' => 1, 'name' => 'Netflix', 'type' => 'expense', 'from' => ['e', 8], 'to' => null, 'amount' => '199.00', 'repeat' => 'monthly', 'day' => 9, 'last_day' => false, 'weekday' => null, 'mode' => 'approve', 'paused' => false, 'pause_reason' => null, 'next_due' => $dd(9, 1), 'created_by' => 8,
        'runs' => [['id' => 11, 'due_date' => date('Y-m-d'), 'status' => 'ready', 'amount' => '199.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null], ['id' => 12, 'due_date' => $dd(9, -1), 'status' => 'done', 'amount' => '199.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => 8], ['id' => 13, 'due_date' => $dd(9, -2), 'status' => 'done', 'amount' => '199.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => 8]]],
    ['id' => 2, 'name' => 'Cellphone contract', 'type' => 'expense', 'from' => ['e', 6], 'to' => null, 'amount' => '349.00', 'repeat' => 'monthly', 'day' => 7, 'last_day' => false, 'weekday' => null, 'mode' => 'auto', 'paused' => false, 'pause_reason' => null, 'next_due' => $dd(7, 1), 'created_by' => 7,
        'runs' => [['id' => 21, 'due_date' => date('Y-m-d', strtotime('-2 days')), 'status' => 'waiting', 'amount' => '349.00', 'attempts' => 3, 'reason' => null, 'resolved_by' => null], ['id' => 22, 'due_date' => $dd(7, -1), 'status' => 'done', 'amount' => '349.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null], ['id' => 23, 'due_date' => $dd(7, -2), 'status' => 'done', 'amount' => '349.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null], ['id' => 24, 'due_date' => $dd(7, -3), 'status' => 'skipped', 'amount' => '349.00', 'attempts' => 4, 'reason' => 'short', 'resolved_by' => null]]],
    ['id' => 3, 'name' => 'Rent', 'type' => 'expense', 'from' => ['e', 5], 'to' => null, 'amount' => '8500.00', 'repeat' => 'monthly', 'day' => 1, 'last_day' => false, 'weekday' => null, 'mode' => 'auto', 'paused' => false, 'pause_reason' => null, 'next_due' => $dd(1, 1), 'created_by' => 7,
        'runs' => [['id' => 31, 'due_date' => $dd(1), 'status' => 'done', 'amount' => '8500.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null], ['id' => 32, 'due_date' => $dd(1, -1), 'status' => 'done', 'amount' => '8500.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null]]],
    ['id' => 4, 'name' => 'Emergency fund top-up', 'type' => 'transfer', 'from' => ['e', 8], 'to' => ['a', 11], 'amount' => '500.00', 'repeat' => 'monthly', 'day' => 25, 'last_day' => false, 'weekday' => null, 'mode' => 'auto', 'paused' => false, 'pause_reason' => null, 'next_due' => $dd(25, date('j') >= 25 ? 1 : 0), 'created_by' => 7,
        'runs' => [['id' => 41, 'due_date' => $dd(25, -1), 'status' => 'done', 'amount' => '500.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null]]],
    ['id' => 5, 'name' => 'Petrol card', 'type' => 'expense', 'from' => ['e', 3], 'to' => null, 'amount' => '250.00', 'repeat' => 'weekly', 'day' => null, 'last_day' => false, 'weekday' => 5, 'mode' => 'auto', 'paused' => false, 'pause_reason' => null, 'next_due' => date('Y-m-d', strtotime('next friday')), 'created_by' => 7,
        'runs' => [['id' => 51, 'due_date' => date('Y-m-d', strtotime('last friday')), 'status' => 'done', 'amount' => '250.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => null]]],
    ['id' => 6, 'name' => 'Kids’ swimming', 'type' => 'expense', 'from' => ['e', 8], 'to' => null, 'amount' => '380.00', 'repeat' => 'monthly', 'day' => 15, 'last_day' => false, 'weekday' => null, 'mode' => 'approve', 'paused' => true, 'pause_reason' => null, 'next_due' => null, 'created_by' => 8,
        'runs' => [['id' => 61, 'due_date' => $dd(15, -1), 'status' => 'done', 'amount' => '380.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => 8], ['id' => 62, 'due_date' => $dd(15, -2), 'status' => 'declined', 'amount' => '380.00', 'attempts' => 1, 'reason' => null, 'resolved_by' => 8]]],
];
$placeOf = function (?array $ref) use (&$state) {
    if (! $ref) { return null; }
    $list = $ref[0] === 'e' ? $state['envelopes'] : $state['accounts'];
    $x = current(array_filter($list, fn ($p) => $p['id'] === $ref[1]));
    return ['id' => $ref[1], 'name' => $x['name'] ?? 'Removed', 'kind' => $ref[0] === 'e' ? 'envelope' : 'account', 'deleted' => ! $x, 'balance' => $x['balance'] ?? 0];
};
$shapeAuto = function (array $i, bool $withRuns = false) use ($placeOf, $s) {
    $open = current(array_filter($i['runs'], fn ($r) => in_array($r['status'], ['waiting', 'ready'], true))) ?: null;
    $from = $placeOf($i['from']);
    $run = fn ($r) => $r + ['transaction_id' => null, 'resolved_at' => null];
    return ['id' => $i['id'], 'name' => $i['name'], 'type' => $i['type'], 'from' => array_diff_key($from, ['balance' => 1]), 'to' => $i['to'] ? array_diff_key($placeOf($i['to']), ['balance' => 1]) : null,
        'amount' => $i['amount'], 'note' => null, 'repeat' => $i['repeat'], 'day' => $i['day'], 'last_day' => $i['last_day'], 'weekday' => $i['weekday'], 'starts_on' => date('Y-m-01', strtotime('-6 months')), 'ends_on' => $i['ends_on'] ?? null,
        'mode' => $i['mode'], 'paused' => $i['paused'], 'pause_reason' => $i['pause_reason'], 'next_due' => $i['paused'] ? null : $i['next_due'], 'created_by' => $i['created_by'],
        'open_run' => $open ? $run($open) + ['source_balance' => $s($from['balance']), 'last_try' => $open['status'] === 'waiting' ? date('Y-m-d', strtotime($open['due_date'].' +3 days')) : null] : null,
    ] + ($withRuns ? ['runs' => array_map($run, $i['runs'])] : []);
};
if (preg_match('#^/api/dashboard/budgets/(\d+)/automatic(/(\d+)(/(pause|resume)|/runs/(\d+)/(approve|run-now|skip))?)?$#', $path, $m) && $method !== 'GET') {
    $id = (int) ($m[3] ?? 0);
    if (! $id) {
        if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
        if (! $amountOk($body['amount'] ?? '')) { return $fail('amount', 'The amount field is required.'); }
        if (($body['repeat'] ?? '') === 'monthly' && empty($body['day']) && empty($body['last_day'])) { return $fail('day', 'Choose the day of the month.'); }
        if (($body['repeat'] ?? '') === 'weekly' && ! isset($body['weekday'])) { return $fail('weekday', 'Choose the day of the week.'); }
        $ref = fn ($side) => ! empty($body["{$side}_envelope_id"]) ? ['e', (int) $body["{$side}_envelope_id"]] : (! empty($body["{$side}_account_id"]) ? ['a', (int) $body["{$side}_account_id"]] : null);
        if (! $ref('from')) { return $fail('from_envelope_id', 'Choose where it comes from.'); }
        if ($body['type'] === 'transfer' && ! $ref('to')) { return $fail('to_envelope_id', 'Choose where it goes.'); }
        $next = $body['repeat'] === 'weekly' ? date('Y-m-d', strtotime('next '.['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][(int) $body['weekday']])) : (! empty($body['last_day']) ? date('Y-m-t') : $dd((int) $body['day'], (int) $body['day'] <= (int) date('j') ? 1 : 0));
        $state['auto'][] = ['id' => ++$state['seq'], 'name' => trim($body['name']), 'type' => $body['type'], 'from' => $ref('from'), 'to' => $body['type'] === 'transfer' ? $ref('to') : null, 'amount' => $body['amount'], 'repeat' => $body['repeat'], 'day' => $body['day'] ?? null, 'last_day' => (bool) ($body['last_day'] ?? false), 'weekday' => $body['weekday'] ?? null, 'mode' => $body['mode'], 'paused' => false, 'pause_reason' => null, 'next_due' => $next, 'created_by' => 7, 'runs' => []];
        $save();
        return $answer($shapeAuto(end($state['auto'])), 201);
    }
    $k = array_search($id, array_column($state['auto'], 'id'), true);
    if ($k === false) { return $answer(['message' => 'Not found.'], 404); }
    $i = &$state['auto'][$k];
    if ($method === 'DELETE') { unset($i); array_splice($state['auto'], $k, 1); $save(); return $answer(null, 204); }
    if (! empty($m[5])) { $i['paused'] = $m[5] === 'pause'; $out = $shapeAuto($i); unset($i); $save(); return $answer($out); }
    if (! empty($m[7])) {
        $r = array_search((int) $m[6], array_column($i['runs'], 'id'), true);
        if ($r === false || ! in_array($i['runs'][$r]['status'], ['waiting', 'ready'], true)) { return $fail('run', 'This one has already been handled.'); }
        if ($m[7] === 'skip') { $i['runs'][$r]['status'] = 'declined'; $i['runs'][$r]['resolved_by'] = 7; }
        else {
            $amt = $body['amount'] ?? $i['runs'][$r]['amount'];
            $from = $placeOf($i['from']);
            if ($m[7] === 'run-now' && $from['balance'] < $c($amt) && empty($body['overspend'])) { return $fail('overspend', $from['name'].' has '.$s($from['balance']).' and this needs '.$amt.'.'); }
            $i['runs'][$r] = array_replace($i['runs'][$r], ['status' => 'done', 'amount' => $amt, 'resolved_by' => 7]);
            foreach ($state['envelopes'] as &$e) { if ($i['from'][0] === 'e' && $e['id'] === $i['from'][1]) { $e['balance'] -= $c($amt); $e['spent'] += $i['type'] === 'expense' ? $c($amt) : 0; } }
            unset($e);
        }
        $out = $i['runs'][$r] + ['transaction_id' => null, 'resolved_at' => date('c')];
        unset($i); $save();
        return $answer($out);
    }
    if (isset($body['amount']) && ! $amountOk($body['amount'])) { return $fail('amount', 'The amount field format is invalid.'); }
    foreach (['name', 'amount', 'repeat', 'day', 'last_day', 'weekday', 'mode', 'ends_on'] as $f) { if (array_key_exists($f, $body)) { $i[$f] = $body[$f]; } }
    $out = $shapeAuto($i); unset($i); $save();
    return $answer($out);
}
$autoList = array_map($shapeAuto, $state['auto']);
$autoReady = array_values(array_filter($autoList, fn ($i) => ($i['open_run']['status'] ?? null) === 'ready'));
if (preg_match('#^/api/dashboard/budgets/(\d+)/automatic$#', $path)) {
    $asked = (int) ($_GET['item'] ?? 0);
    $sel = current(array_filter($state['auto'], fn ($i) => $i['id'] === $asked)) ?: null;
    return $answer(['data' => $autoList, 'ready' => $autoReady, 'ready_count' => count($autoReady), 'selected' => $sel ? $shapeAuto($sel, true) : null,
        'envelopes' => $envelopes, 'accounts' => array_values(array_filter($accounts, fn ($a) => $a['type'] !== 'investment')), 'members' => $overview['members']]);
}

// Calculators (W16): saved inputs (shared with the budget), what the page offers from the figures.
$state['calcs'] ??= [
    ['id' => 1, 'kind' => 'retirement', 'name' => 'Retire at 65', 'inputs' => ['age' => 35, 'retire_age' => 65, 'spending' => 30000, 'saved' => 141540, 'monthly' => 3000, 'raise' => 6, 'raise_mode' => 'percent'], 'author' => 'Thandi', 'updated_by' => 'Thandi', 'updated_at' => date('c', strtotime('-6 days'))],
    ['id' => 2, 'kind' => 'home_loan', 'name' => 'Parkhurst house', 'inputs' => ['loan' => 2400000, 'deposit' => 240000, 'rate' => 11.25, 'years' => 20, 'extra' => 1000, 'testRate' => 12.25], 'author' => 'Hudson', 'updated_by' => 'Hudson', 'updated_at' => date('c', strtotime('-14 days'))],
    ['id' => 3, 'kind' => 'growth', 'name' => 'Kids’ varsity', 'inputs' => ['mode' => 'monthly', 'target' => 500000, 'years' => 10, 'saved' => 20000, 'monthly' => 1500, 'growth' => 9, 'inflation' => 5, 'target_basis' => 'then'], 'author' => 'Thandi', 'updated_by' => null, 'updated_at' => date('c', strtotime('-30 days'))],
];
if (preg_match('#^/api/dashboard/budgets/(\d+)/calculations(/(\d+))?$#', $path, $m) && $method !== 'GET') {
    $id = (int) ($m[3] ?? 0);
    if ($method === 'DELETE') { $state['calcs'] = array_values(array_filter($state['calcs'], fn ($c) => $c['id'] !== $id)); $save(); return $answer(null, 204); }
    if (trim((string) ($body['name'] ?? 'x')) === '') { return $fail('name', 'The name field is required.'); }
    if ($method === 'POST') {
        $row = ['id' => max(array_column($state['calcs'], 'id') ?: [0]) + 1, 'kind' => $body['kind'], 'name' => trim($body['name']), 'inputs' => $body['inputs'], 'author' => 'You', 'updated_by' => 'You', 'updated_at' => date('c')];
        array_unshift($state['calcs'], $row); $created = true;
    } else {
        foreach ($state['calcs'] as $k => $c) { if ($c['id'] === $id) { $state['calcs'][$k] = array_replace($c, array_intersect_key($body, ['name' => 1, 'inputs' => 1]), ['updated_by' => 'You', 'updated_at' => date('c')]); $row = $state['calcs'][$k]; } }
        $state['calcs'] = array_values($state['calcs']);
    }
    $save();
    return $answer($row, ! empty($created) ? 201 : 200);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/calculators$#', $path, $m)) {
    return $answer(['calculations' => $state['calcs'], 'prefill' => ['investments' => (int) $m[1] === 4 ? null : ['value' => 141540, 'count' => 2], 'spending_now' => (int) $m[1] === 4 ? null : 18400]]);
}

// Notes, Members and Budget settings (W17, W17b, W17c).
$state['notes'] ??= [
    ['id' => 1, 'body' => 'Eating out ran over again: birthdays. Plan R1,450 for December.', 'shared' => true, 'cycle_start' => date('Y-m-01'), 'remind_at' => null, 'mine' => false, 'author' => 'Thandi', 'created_at' => date('c', strtotime('-9 days'))],
    ['id' => 2, 'body' => 'Car licence due in February. Holding should reach R4,200 by then.', 'shared' => true, 'cycle_start' => null, 'remind_at' => date('c', strtotime('+7 days 08:00')), 'mine' => true, 'author' => 'Hudson', 'created_at' => date('c', strtotime('-14 days'))],
    ['id' => 3, 'body' => "Kids’ swimming paused for the holidays.\nResume 15 Jan.", 'shared' => false, 'cycle_start' => null, 'remind_at' => null, 'mine' => true, 'author' => 'Hudson', 'created_at' => date('c', strtotime('-16 days'))],
];
$state['invites'] ??= [['id' => 1, 'email' => 'sipho@example.com', 'expires_at' => date('c', strtotime('+5 days'))]];
$state['bname'] ??= [3 => 'Our home', 4 => 'Holiday house'];
$state['bday'] ??= [3 => 1, 4 => 1];
if (preg_match('#^/api/dashboard/budgets/(\d+)/notes(/(\d+))?$#', $path, $m)) {
    $id = (int) ($m[3] ?? 0);
    if ($method === 'GET') { return $answer(['notes' => $state['notes'], 'cycle' => ['start' => date('Y-m-01'), 'end' => date('Y-m-t')]]); }
    if ($method === 'DELETE') { $state['notes'] = array_values(array_filter($state['notes'], fn ($n) => $n['id'] !== $id)); $save(); return $answer(null, 204); }
    if (trim((string) ($body['body'] ?? 'x')) === '') { return $fail('body', 'The body field is required.'); }
    $row = ['id' => ++$state['seq'], 'body' => trim($body['body']), 'shared' => (bool) ($body['shared'] ?? false), 'cycle_start' => ! empty($body['this_cycle']) ? date('Y-m-01') : null, 'remind_at' => $body['remind_at'] ?? null, 'mine' => true, 'author' => 'Hudson', 'created_at' => date('c')];
    array_unshift($state['notes'], $row); $save();
    return $answer($row, 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/members$#', $path, $m)) {
    return $answer(['me' => 7, 'is_owner' => (int) $m[1] === 3, 'members' => [['id' => 7, 'name' => 'Hudson', 'email' => 'hudson@example.com', 'role' => (int) $m[1] === 3 ? 'owner' : 'member'], ['id' => 8, 'name' => 'Thandi', 'email' => 'thandi@example.com', 'role' => (int) $m[1] === 3 ? 'member' : 'owner']], 'invitations' => (int) $m[1] === 3 ? $state['invites'] : []]);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/invitations(/(\d+))?$#', $path, $m)) {
    if ($method === 'DELETE') { $state['invites'] = array_values(array_filter($state['invites'], fn ($i) => $i['id'] !== (int) $m[3])); $save(); return $answer(null, 204); }
    if (($body['email'] ?? '') === 'thandi@example.com') { return $fail('email', 'This person is already a member of the budget.'); }
    $state['invites'] = array_values(array_filter($state['invites'], fn ($i) => $i['email'] !== $body['email']));
    $state['invites'][] = ['id' => ++$state['seq'], 'email' => $body['email'], 'expires_at' => date('c', strtotime('+7 days'))]; $save();
    return $answer(end($state['invites']), 201);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/(members/\d+|owner|leave)$#', $path) && $method !== 'GET') { return $answer(null, 204); }
if (preg_match('#^/api/dashboard/budgets/(\d+)/settings$#', $path, $m)) {
    return $answer(['id' => (int) $m[1], 'name' => $state['bname'][(int) $m[1]], 'currency' => 'ZAR', 'cycle_start_day' => $state['bday'][(int) $m[1]], 'monthly_income' => '22850.00', 'role' => (int) $m[1] === 3 ? 'owner' : 'member', 'premium' => ['active' => (int) $m[1] === 3, 'status' => (int) $m[1] === 3 ? 'premium' : 'free', 'until' => '2027-03-02', 'forever' => false], 'paused' => false]);
}
if (preg_match('#^/api/dashboard/budgets/(\d+)$#', $path, $m) && $method !== 'GET') {
    if ($method === 'DELETE') { return $answer(null, 204); }
    if (isset($body['name']) && trim($body['name']) === '') { return $fail('name', 'The name field is required.'); }
    $state['bname'][(int) $m[1]] = trim($body['name'] ?? $state['bname'][(int) $m[1]]); $state['bday'][(int) $m[1]] = (int) ($body['cycle_start_day'] ?? $state['bday'][(int) $m[1]]); $save();
    return $answer(['id' => (int) $m[1], 'name' => $state['bname'][(int) $m[1]], 'cycle_start_day' => $state['bday'][(int) $m[1]], 'role' => 'owner', 'premium' => ['active' => true, 'status' => 'premium', 'until' => '2027-03-02', 'forever' => false]]);
}

// Help (W18): the person's own support conversations.
$state['threads'] ??= [
    ['id' => 1, 'kind' => 'problem', 'subject' => 'Something’s not working', 'status' => 'answered', 'unread' => true, 'created_at' => date('c', strtotime('-6 days')),
        'messages' => [['id' => 1, 'from_admin' => false, 'author' => 'You', 'body' => 'My October recap opened as September after I changed when my month starts.', 'attachments' => [], 'created_at' => date('c', strtotime('-6 days'))], ['id' => 2, 'from_admin' => true, 'author' => 'PocFin support', 'body' => 'Changing the start day keeps past recaps on their old dates, so October now sits under 25 Sep. We’ve made the name clearer in the next update.', 'attachments' => [], 'created_at' => date('c', strtotime('-5 days'))]]],
    ['id' => 2, 'kind' => 'question', 'subject' => 'A question', 'status' => 'closed', 'unread' => false, 'created_at' => date('c', strtotime('-16 days')),
        'messages' => [['id' => 3, 'from_admin' => false, 'author' => 'You', 'body' => 'Can I export to Excel?', 'attachments' => [], 'created_at' => date('c', strtotime('-16 days'))]]],
];
$threadItem = fn (array $t) => ['id' => $t['id'], 'kind' => $t['kind'], 'subject' => $t['subject'], 'status' => $t['status'], 'preview' => $t['messages'][0]['body'], 'last_from_admin' => end($t['messages'])['from_admin'], 'unread' => $t['unread'], 'last_message_at' => end($t['messages'])['created_at'], 'created_at' => $t['created_at']];
if ($path === '/api/dashboard/help') {
    $asked = (int) ($_GET['thread'] ?? 0); $sel = null;
    foreach ($state['threads'] as $k => $t) { if ($t['id'] === $asked) { $state['threads'][$k]['unread'] = false; $sel = $state['threads'][$k]; $save(); } }
    $items = array_map($threadItem, $state['threads']);
    return $answer(['data' => $items, 'unread' => count(array_filter($items, fn ($t) => $t['unread'])), 'selected' => $sel ? $threadItem($sel) + ['messages' => $sel['messages']] : null]);
}
$in = $_POST + $body;
if (preg_match('#^/api/dashboard/support/threads(/(\d+)/(messages|close))?$#', $path, $m) && $method === 'POST') {
    $labels = ['problem' => 'Something’s not working', 'question' => 'A question', 'idea' => 'An idea', 'account' => 'Account or Premium'];
    $msg = fn () => ['id' => ++$state['seq'], 'from_admin' => false, 'author' => 'You', 'body' => trim($in['body'] ?? ''), 'attachments' => [], 'created_at' => date('c')];
    if (empty($m[1])) {
        if (trim($in['body'] ?? '') === '') { return $fail('body', 'Write a message first.'); }
        $state['threads'][] = ['id' => ++$state['seq'], 'kind' => $in['kind'], 'subject' => $labels[$in['kind']] ?? 'A question', 'status' => 'open', 'unread' => false, 'created_at' => date('c'), 'messages' => [$msg()]];
        $t = end($state['threads']); $save();
        return $answer($threadItem($t) + ['messages' => $t['messages']], 201);
    }
    foreach ($state['threads'] as $k => $t) {
        if ($t['id'] !== (int) $m[2]) { continue; }
        if ($m[3] === 'close') { $state['threads'][$k]['status'] = 'closed'; } else {
            if (trim($in['body'] ?? '') === '') { return $fail('body', 'Write a message first.'); }
            $state['threads'][$k]['messages'][] = $msg(); $state['threads'][$k]['status'] = 'open';
        }
        $save(); $t = $state['threads'][$k];
        return $answer($threadItem($t) + ['messages' => $t['messages']], $m[3] === 'close' ? 200 : 201);
    }
    return $answer(['message' => 'Not found.'], 404);
}

// Analytics (W15): this month from the sample's figures; trends and insights as the boards show them.
if (preg_match('#^/api/dashboard/budgets/(\d+)/analytics$#', $path, $m)) {
    $tab = $_GET['tab'] ?? 'month';
    if ($tab !== 'month' && (int) $m[1] === 4) { return $answer(['tab' => $tab, 'premium_required' => true, 'month' => null, 'trends' => null, 'insights' => null]); }
    $usual = [1 => 416000, 2 => 105000, 3 => 145000, 4 => 79500, 5 => 850000, 6 => 100000, 7 => 20000, 8 => 30000];
    $refunds = 0; foreach ($state['expenses'] as $x) { if ($x['refund']) { $refunds += $x['amount']; } }
    $spentNet = array_sum(array_column($state['envelopes'], 'spent')) - $refunds;
    $kept = 2285000 - $spentNet;
    $asked = $_GET['date'] ?? date('Y-m-d');
    $current = substr($asked, 0, 7) === date('Y-m');
    $start = date('Y-m-01', strtotime($asked)); $end = date('Y-m-t', strtotime($asked));
    $month = [
        'cycle' => ['start' => $start, 'end' => $end, 'start_day' => 1], 'current' => $current,
        'days' => ['total' => (int) date('t', strtotime($asked)), 'elapsed' => $current ? (int) date('j') : (int) date('t', strtotime($asked))],
        'income' => '22850.00', 'spent' => $s($spentNet + $refunds), 'refunded' => $s($refunds), 'spent_net' => $s($spentNet),
        'kept' => $s($current ? $kept : 245000), 'kept_percent' => (int) round(($current ? $kept : 245000) / 2285000 * 100), 'moved_to_accounts' => '2000.00',
        'pace' => $current ? ['kept' => '3900.00', 'spent' => '18950.00'] : null, 'previous_kept' => '2450.00', 'transactions' => 31,
        'envelopes' => array_map(fn ($e) => ['id' => $e['id'], 'name' => $e['name'], 'kind' => $e['kind'], 'budgeted_amount' => $s($e['target']), 'spent' => $s($current ? $e['spent'] : (int) round(($usual[$e['id']] ?? 0) * 0.95)), 'usual' => isset($usual[$e['id']]) ? $s($usual[$e['id']]) : null, 'balance' => $s($e['balance'])], array_values(array_filter($state['envelopes'], fn ($e) => empty($e['archived'])))),
        'accounts' => [['id' => 12, 'name' => 'Car licence and tax', 'spent' => '0.00']],
    ];
    $tm = fn ($n, $spent, $moved) => ['start' => date('Y-m-01', strtotime("-$n months")), 'end' => date('Y-m-t', strtotime("-$n months")), 'current' => $n === 0, 'income' => '22850.00', 'spent_net' => $s($spent), 'kept' => $s(2285000 - $spent), 'kept_percent' => (int) round((2285000 - $spent) / 2285000 * 100), 'moved_to_accounts' => $s($moved)];
    $trends = ['ready' => true, 'months' => [$tm(5, 2130000, 150000), $tm(4, 2095000, 150000), $tm(3, 2210000, 100000), $tm(2, 1980000, 250000), $tm(1, 2040000, 200000), $tm(0, $spentNet, 200000)],
        'average_kept_percent' => 9, 'months_kept' => 6, 'months_counted' => 6,
        'rhythm' => ['months' => 3, 'weeks' => ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 'week_shares' => [0.32, 0.21, 0.26, 0.21], 'weekdays' => ['820.00', '410.00', '380.00', '450.00', '690.00', '1320.00', '1710.00'], 'busiest_weekday' => ['day' => 6, 'envelope' => 'Groceries'], 'small' => ['under' => '100.00', 'count' => 14, 'amount' => '612.00', 'envelope' => 'Eating out']]];
    $insights = ['ready' => true, 'months_of_data' => 6, 'months_needed' => 3, 'cards' => [
        ['kind' => 'over_plan', 'key' => 'over-2', 'envelope_id' => 2, 'name' => 'Eating out', 'budgeted' => $s($byId[2]['target']), 'usual' => '1450.00', 'suggested' => '1450.00', 'months' => 3],
        ['kind' => 'idle', 'key' => 'idle-7', 'envelope_id' => 7, 'name' => 'Clothing', 'amount' => '950.00', 'months' => 3],
        ['kind' => 'repeat', 'key' => 'repeat-fibre', 'note' => 'Fibre', 'amount' => '1000.00', 'day' => 3, 'envelope_id' => 6, 'account_id' => null, 'months' => 3],
        ['kind' => 'spare', 'key' => 'spare', 'amount' => '850.00', 'planned' => '22000.00', 'income' => '22850.00', 'months' => 3],
    ]];
    return $answer(['tab' => $tab, 'premium_required' => false, 'month' => $tab === 'month' ? $month : null, 'trends' => $tab === 'trends' ? $trends : null, 'insights' => $tab === 'insights' ? $insights : null]);
}

// Goals (W13): the boards' four goals and two past ones, shaped like the API's goal report.
$m0 = date('Y-m-01');
$mAgo = fn (int $n) => date('Y-m-01', strtotime("$m0 -$n months"));
$mOn = fn (int $n) => date('Y-m-01', strtotime("$m0 +$n months"));
$cyc = fn (string $start, string $needed, string $in, string $status) => ['start' => $start, 'end' => date('Y-m-t', strtotime($start)), 'needed' => $needed, 'in' => $in, 'status' => $status];
$goalBase = fn (array $g) => array_replace([
    'icon' => null, 'purpose_id' => null, 'target_amount' => null, 'amount_per_cycle' => null, 'target_month' => null, 'year_start_month' => null,
    'opening_amount' => '0.00', 'plan_from' => $m0, 'starts_on' => $mAgo(11), 'upcoming' => false, 'review_month' => null, 'remind_on_payday' => true,
    'raise_mode' => null, 'raise_value' => null, 'growth_pct' => null, 'spread_pct' => null, 'inflation_pct' => null, 'age' => null, 'retire_age' => null,
    'status' => 'active', 'finished_at' => null, 'outcome' => null, 'snoozed_until' => null, 'reviewed_at' => null, 'created_by' => 7, 'updated_by' => 7,
    'counts' => ['on_track' => 0, 'extra' => 0, 'rest' => 0, 'of' => 0], 'total' => '0.00', 'to_go' => null, 'cycles_left' => null, 'pace' => null, 'reached' => false,
    'behind' => null, 'needs_look' => false, 'year' => null, 'value' => null, 'growth_so_far' => null, 'review_due' => false,
], $g);
$paid = ! empty($state['goal_paid']);
$state['goals_extra'] ??= [];
$state['goals_gone'] ??= [];
$allGoals = array_values(array_filter([
    $goalBase(['id' => 1, 'kind' => 'habit', 'name' => 'Emergency fund', 'account_id' => 11, 'link' => ['type' => 'account', 'name' => 'Emergency fund', 'account_type' => 'savings'],
        'amount_per_cycle' => '500.00', 'total' => '42300.00', 'counts' => ['on_track' => 10, 'extra' => 1, 'rest' => 1, 'of' => 11], 'state' => $paid ? 'on_track' : 'waiting',
        'this_cycle' => $cyc($m0, '500.00', $paid ? '500.00' : '0.00', $paid ? 'on' : 'waiting') + ['left' => $paid ? '0.00' : '500.00'],
        'cycles' => array_map(fn ($i) => $cyc($mAgo(11 - $i), '500.00', $i === 3 ? '0.00' : '500.00', $i === 11 ? ($paid ? 'on' : 'waiting') : ($i === 3 ? 'rest' : ($i === 6 ? 'extra' : 'on'))), range(0, 11))]),
    $goalBase(['id' => 2, 'kind' => 'yearly', 'name' => 'Tax-free top-up', 'account_id' => 13, 'link' => ['type' => 'account', 'name' => 'Long-term investments', 'account_type' => 'investment'],
        'target_amount' => '46000.00', 'total' => '27000.00', 'starts_on' => $mAgo(8), 'state' => 'on_track',
        'year' => ['start' => $mAgo(8), 'end' => date('Y-m-t', strtotime($mOn(3))), 'total' => '27000.00', 'cycles_left' => 4],
        'this_cycle' => $cyc($m0, '4750.00', '0.00', 'waiting') + ['left' => '4750.00'],
        'cycles' => array_map(fn ($i) => $cyc($mAgo(8 - $i), '4600.00', in_array($i, [2, 5], true) ? '2000.00' : '3833.33', $i === 8 ? 'waiting' : (in_array($i, [2, 5], true) ? 'rest' : 'on')), range(0, 8))]),
    $goalBase(['id' => 3, 'kind' => 'value', 'name' => 'Retire at 65', 'account_id' => 13, 'link' => ['type' => 'account', 'name' => 'Long-term investments', 'account_type' => 'investment'],
        'target_amount' => '80000000.00', 'amount_per_cycle' => '1500.00', 'target_month' => '2061-03', 'opening_amount' => '120000.00', 'plan_from' => $mAgo(10), 'starts_on' => $mAgo(10),
        'review_month' => 3, 'raise_mode' => 'percent', 'raise_value' => '6.00', 'growth_pct' => '10.00', 'spread_pct' => '2.00', 'inflation_pct' => '5.00', 'age' => 30, 'retire_age' => 65,
        'value' => '141540.12', 'growth_so_far' => ['since' => $mAgo(10), 'time_weighted_return' => '9.86'], 'state' => 'on_track', 'total' => '15000.00',
        'this_cycle' => $cyc($m0, '1500.00', '1500.00', 'on') + ['left' => '0.00']]),
    $goalBase(['id' => 4, 'kind' => 'target', 'name' => 'Car deposit', 'account_id' => 12, 'link' => ['type' => 'account', 'name' => 'Car licence and tax', 'account_type' => 'holding'],
        'target_amount' => '12000.00', 'target_month' => date('Y-m', strtotime($mOn(7))), 'total' => '3100.00', 'to_go' => '8900.00', 'cycles_left' => 8, 'pace' => '1112.50', 'starts_on' => $mAgo(4),
        'state' => 'needs_look', 'needs_look' => true, 'behind' => ['cycles_worth' => 2, 'asks' => true, 'was' => '890.00', 'now' => '1112.50', 'move_to' => date('Y-m', strtotime($mOn(11)))],
        'this_cycle' => $cyc($m0, '1112.50', '0.00', 'waiting') + ['left' => '1112.50'],
        'cycles' => array_map(fn ($i) => $cyc($mAgo(4 - $i), '890.00', $i < 2 ? '1550.00' : '0.00', $i === 4 ? 'waiting' : ($i < 2 ? 'on' : 'rest')), range(0, 4))]),
    $goalBase(['id' => 5, 'kind' => 'target', 'name' => 'New fridge', 'account_id' => 11, 'link' => ['type' => 'account', 'name' => 'Emergency fund', 'account_type' => 'savings'],
        'target_amount' => '9000.00', 'total' => '9000.00', 'status' => 'finished', 'finished_at' => $mAgo(3), 'outcome' => 'reached', 'reached' => true, 'state' => 'finished', 'this_cycle' => null]),
    $goalBase(['id' => 6, 'kind' => 'habit', 'name' => 'Holiday 2025', 'account_id' => 12, 'link' => ['type' => 'account', 'name' => 'Car licence and tax', 'account_type' => 'holding'],
        'amount_per_cycle' => '400.00', 'total' => '3600.00', 'status' => 'finished', 'finished_at' => $mAgo(7), 'outcome' => 'ended', 'state' => 'finished', 'this_cycle' => null, 'counts' => ['on_track' => 9, 'extra' => 0, 'rest' => 1, 'of' => 10]]),
    ...array_map($goalBase, $state['goals_extra']),
], fn ($g) => ! in_array($g['id'], $state['goals_gone'], true)));
foreach ($allGoals as &$g) { if (isset($state['goal_edits'][$g['id']])) { $g = array_replace($g, $state['goal_edits'][$g['id']]); } }
unset($g);
if (preg_match('#^/api/dashboard/budgets/(\d+)/goals(/(\d+)(/(finish|snooze|reviewed))?)?$#', $path, $m) && $method !== 'GET') {
    $id = (int) ($m[3] ?? 0);
    if ($method === 'POST' && ! $id) {
        if (trim((string) ($body['name'] ?? '')) === '') { return $fail('name', 'The name field is required.'); }
        if (in_array($body['kind'] ?? '', ['target', 'yearly', 'value'], true) && ! $amountOk($body['target_amount'] ?? '')) { return $fail('target_amount', 'The target amount field is required.'); }
        if (in_array($body['kind'] ?? '', ['habit', 'value'], true) && ! $amountOk($body['amount_per_cycle'] ?? '')) { return $fail('amount_per_cycle', 'The amount per cycle field is required.'); }
        $acc = current(array_filter($state['accounts'], fn ($a) => $a['id'] === (int) ($body['account_id'] ?? 0)));
        $new = ['id' => ++$state['seq'], 'kind' => $body['kind'], 'name' => trim($body['name']), 'account_id' => $acc['id'] ?? null, 'purpose_id' => $body['purpose_id'] ?? null,
            'link' => ['type' => $acc ? 'account' : 'purpose', 'name' => $acc['name'] ?? ($state['purposes'][$body['purpose_id'] ?? 0] ?? 'Purpose'), 'account_type' => $acc['type'] ?? null],
            'target_amount' => $body['target_amount'] ?? null, 'amount_per_cycle' => $body['amount_per_cycle'] ?? null, 'target_month' => $body['target_month'] ?? null,
            'starts_on' => $body['starts_on'] ?? date('Y-m-d'), 'plan_from' => $m0, 'remind_on_payday' => (bool) ($body['remind_on_payday'] ?? true),
            'state' => 'waiting', 'this_cycle' => ['start' => $m0, 'end' => date('Y-m-t'), 'needed' => $body['amount_per_cycle'] ?? '0.00', 'in' => '0.00', 'left' => $body['amount_per_cycle'] ?? '0.00', 'status' => 'waiting'], 'cycles' => []];
        if (($body['kind'] ?? '') === 'value') { $new += ['growth_pct' => '10.00', 'spread_pct' => '2.00', 'inflation_pct' => '5.00', 'raise_mode' => 'percent', 'raise_value' => '6.00', 'value' => $s(($acc['value'] ?? 0)), 'opening_amount' => $s($acc['value'] ?? 0), 'review_month' => (int) date('n')]; }
        $state['goals_extra'][] = $new;
        $save();
        return $answer(['id' => $new['id']] + $new, 201);
    }
    if (! in_array($id, array_column($allGoals, 'id'), true)) { return $answer(['message' => 'Not found.'], 404); }
    if ($method === 'DELETE') { $state['goals_gone'][] = $id; $save(); return $answer(null, 204); }
    $edit = match ($m[5] ?? '') {
        'finish' => ['status' => 'finished', 'state' => 'finished', 'finished_at' => date('Y-m-d'), 'outcome' => ! empty($body['reached']) ? 'reached' : 'ended', 'this_cycle' => null],
        'snooze' => ['snoozed_until' => date('Y-m-t'), 'state' => 'waiting', 'needs_look' => false, 'behind' => null],
        'reviewed' => ['review_due' => false, 'reviewed_at' => date('c')],
        default => array_intersect_key($body, array_flip(['name', 'target_amount', 'amount_per_cycle', 'target_month', 'remind_on_payday', 'kind'])) + ['needs_look' => false, 'behind' => null, 'state' => 'waiting', 'snoozed_until' => null],
    };
    $state['goal_edits'][$id] = array_replace($state['goal_edits'][$id] ?? [], $edit);
    $save();
    return $answer(array_replace(current(array_filter($allGoals, fn ($g) => $g['id'] === $id)), $edit));
}
if (preg_match('#^/api/dashboard/budgets/(\d+)/goals$#', $path)) {
    $asked = (int) ($_GET['goal'] ?? 0);
    $list = array_map(fn ($g) => array_diff_key($g, ['cycles' => 1]), $allGoals);
    $sel = current(array_filter($allGoals, fn ($g) => $g['id'] === $asked)) ?: null;
    return $answer(['goals' => $list, 'selected' => $sel ? $sel + ['cycles' => []] : null, 'accounts' => $accounts, 'purposes' => array_map(fn ($id, $n) => ['id' => $id, 'name' => $n], array_keys($state['purposes'] ?? []), $state['purposes'] ?? []), 'cycle' => $overview['summary']['cycle']]);
}

// Accounts (W11): every account, the totals, purposes, goals, and the chosen one's money in and out.
if (preg_match('#^/api/dashboard/budgets/(\d+)/accounts$#', $path)) {
    $sel = (int) ($_GET['account'] ?? 0) ?: (current(array_filter($accounts, fn ($a) => $a['type'] === 'investment'))['id'] ?? null);
    $byType = fn ($t) => $s(array_sum(array_map(fn ($a) => $a['value'] ?? $a['balance'], array_filter($state['accounts'], fn ($a) => $a['type'] === $t))));
    $txs = array_values(array_filter($state['account_tx'] ?? [], fn ($t) => $t['account_id'] === $sel));
    $seeded = [11 => [['id' => 901, 'account_id' => 11, 'type' => 'add', 'amount' => '312.40', 'date' => date('Y-m-d', strtotime('last day of last month')), 'note' => 'Interest', 'created_by' => 7]]];
    return $answer([
        'accounts' => $accounts,
        'summary' => array_replace($overview['summary'], ['accounts' => ['savings' => $byType('savings'), 'holding' => $byType('holding'), 'investments' => $byType('investment'), 'total' => $s($total)]]),
        'members' => $overview['members'],
        'selected_id' => $sel,
        'purposes' => array_values(array_map(function ($id, $name) use (&$state, $s) {
            $v = 0; $put = 0;
            foreach ($state['holdings'] as $h) { foreach ($h['pos'] as $p) { if ($p[0] === $id) { $v += $p[1]; $put += $p[2]; } } }
            return ['id' => $id, 'name' => $name, 'net_contributed' => $s($put), 'value' => $s($v), 'gain' => $s($v - $put)];
        }, array_keys($state['purposes'] ?? []), $state['purposes'] ?? [])),
        'goals' => [['id' => 1, 'name' => 'Emergency fund', 'account_id' => 11, 'kind' => 'habit', 'status' => 'active', 'state' => empty($state['goal_paid']) ? 'waiting' : 'on_track', 'target_amount' => null, 'total' => null, 'this_cycle' => ['needed' => '500.00', 'in' => empty($state['goal_paid']) ? '0.00' : '500.00', 'left' => empty($state['goal_paid']) ? '500.00' : '0.00', 'status' => empty($state['goal_paid']) ? 'waiting' : 'on']]],
        ...(function () use (&$state, $sel, $s) {
            $acc = current(array_filter($state['accounts'], fn ($a) => $a['id'] === $sel));
            if (! $acc || $acc['type'] !== 'investment') { return ['holdings' => [], 'returns' => (object) [], 'valuations' => (object) []]; }
            $rate = isset($acc['usd_rate']) ? (float) $acc['usd_rate'] : null;
            $usd = fn ($c) => $rate ? number_format($c / 100 / $rate, 2, '.', '') : null;
            $period = $_GET['period'] ?? 'ytd';
            $out = ['holdings' => [], 'returns' => [], 'valuations' => []];
            foreach (array_filter($state['holdings'], fn ($h) => $h['account_id'] === $sel) as $h) {
                $v = array_sum(array_column($h['pos'], 1)); $put = array_sum(array_column($h['pos'], 2));
                $out['holdings'][] = ['id' => $h['id'], 'account_id' => $sel, 'name' => $h['name'], 'value' => $s($v), 'usd_rate' => $acc['usd_rate'] ?? null, 'value_usd' => $usd($v),
                    'last_valuation' => $h['vals'] ? ['date' => $h['vals'][0][0], 'value' => $s($h['vals'][0][1]), 'value_usd' => $usd($h['vals'][0][1])] : null,
                    'positions' => array_map(fn ($p) => ['id' => $p[0] * 100 + $h['id'], 'purpose_id' => $p[0], 'purpose' => $state['purposes'][$p[0]] ?? 'Purpose', 'value' => $s($p[1]), 'value_usd' => $usd($p[1])], $h['pos'])];
                $out['returns'][$h['id']] = ['holding_id' => $h['id'], 'net_contributed' => $s($put), 'value' => $s($v), 'gain' => $s($v - $put), 'simple_return' => $put > 0 ? number_format(($v - $put) / $put * 100, 2, '.', '') : null, 'time_weighted_return' => $h['twr'][$period] ?? null,
                    'positions' => array_map(fn ($p) => ['purpose_id' => $p[0], 'net_contributed' => $s($p[2]), 'value' => $s($p[1]), 'gain' => $s($p[1] - $p[2]), 'simple_return' => $p[2] > 0 ? number_format(($p[1] - $p[2]) / $p[2] * 100, 2, '.', '') : null], $h['pos'])];
                $out['valuations'][$h['id']] = array_map(fn ($x, $i) => ['id' => $h['id'] * 1000 + count($h['vals']) - $i, 'date' => $x[0], 'value' => $s($x[1]), 'foreign_value' => $usd($x[1]), 'rate' => $acc['usd_rate'] ?? null, 'created_by' => 7, 'deletable' => $i === 0], array_slice($h['vals'], 0, 12), array_keys(array_slice($h['vals'], 0, 12)));
            }
            return [...$out, 'returns' => $out['returns'] ?: (object) [], 'valuations' => $out['valuations'] ?: (object) []];
        })(),
        'allocations' => ['data' => $sel === 11 ? [['id' => 801, 'deposit_id' => 40, 'deposit_note' => 'Salary', 'account_id' => 11, 'amount' => '500.00', 'date' => date('Y-m-01', strtotime('-1 month')), 'created_by' => 7]] : []],
        'transactions' => ['data' => [...array_reverse($txs), ...($seeded[$sel] ?? [])]],
        'transfers' => ['data' => array_map($shapeTransfer, array_values(array_filter($state['transfers'] ?? [], fn ($t) => ($t['from_account_id'] ?? 0) === $sel || ($t['to_account_id'] ?? 0) === $sel)))],
    ]);
}

// History (W10): one page of a tab, with the filters, newest or oldest first; and every row for the CSV.
$historyList = function (string $tab, array $g) use (&$state, $shapeExpense, $shapeDeposit, $shapeTransfer, $byId, $s) {
    $key = ['spent' => 'expenses', 'income' => 'deposits', 'moved' => 'transfers'][$tab];
    $rows = $state[$key];
    usort($rows, fn ($a, $b) => [$b['date'], $b['id']] <=> [$a['date'], $a['id']]);
    $q = strtolower(trim((string) ($g['q'] ?? '')));
    $rows = array_values(array_filter($rows, function ($r) use ($q, $g, $byId, $s) {
        if ($q !== '' && ! str_contains(strtolower(($r['note'] ?? '').' '.($byId[$r['envelope_id'] ?? 0]['name'] ?? '').' '.$s($r['amount'])), $q)) { return false; }
        if (! empty($g['from']) && $r['date'] < $g['from']) { return false; }
        if (! empty($g['to']) && $r['date'] > $g['to']) { return false; }
        if (! empty($g['envelope_id']) && ($r['envelope_id'] ?? null) !== (int) $g['envelope_id']) { return false; }
        return true;
    }));
    if (($g['order'] ?? '') === 'oldest') { $rows = array_reverse($rows); }
    $shape = ['spent' => $shapeExpense, 'income' => $shapeDeposit, 'moved' => $shapeTransfer][$tab];
    return array_map($shape, $rows);
};
if (preg_match('#^/api/dashboard/budgets/(\d+)/history(/export)?$#', $path, $m)) {
    $tab = $_GET['tab'] ?? 'spent';
    $all = $historyList($tab, $_GET);
    $names = ['envelopes' => $envelopes, 'accounts' => $accounts, 'members' => $overview['members']];
    if (! empty($m[2])) { return $answer(['tab' => $tab, 'rows' => $all, 'truncated' => false, ...$names]); }
    $per = (int) ($_GET['per_page'] ?? 50); $page = max(1, (int) ($_GET['page'] ?? 1));
    return $answer(['tab' => $tab, 'list' => ['data' => array_slice($all, ($page - 1) * $per, $per), 'current_page' => $page, 'last_page' => max(1, (int) ceil(count($all) / $per)), 'per_page' => $per, 'total' => count($all), 'unallocated' => $s($state['unallocated'])], ...$names]);
}

// The Budget page: live envelopes with this month's figures, archived ones, and one envelope's activity.
if (preg_match('#^/api/dashboard/budgets/(\d+)/budget$#', $path)) {
    $refunds = [];
    foreach ($state['expenses'] as $x) { if ($x['refund']) { $refunds[$x['envelope_id']] = ($refunds[$x['envelope_id']] ?? 0) + $x['amount']; } }
    $live = array_values(array_filter($envelopes, fn ($e) => ! $e['archived']));
    $live = array_map(fn ($e) => [...$e, 'allocated_this_cycle' => $s($byId[$e['id']]['alloc'] ?? 0), 'spent_this_cycle' => $s($byId[$e['id']]['spent']), 'refunded_this_cycle' => $s($refunds[$e['id']] ?? 0)], $live);
    $asked = (int) ($_GET['envelope'] ?? 0);
    $sel = in_array($asked, array_column($live, 'id'), true) ? $asked : ($live[0]['id'] ?? null);
    $alloc = $sel ? ($byId[$sel]['alloc'] ?? 0) : 0;
    return $answer([
        'summary' => $overview['summary'],
        'envelopes' => $live,
        'archived' => array_values(array_filter($envelopes, fn ($e) => $e['archived'])),
        'left_from' => $overview['left_from'],
        'selected_id' => $sel,
        'activity' => $sel ? [
            'spent' => array_map($shapeExpense, array_values(array_filter($state['expenses'], fn ($x) => $x['envelope_id'] === $sel))),
            'allocated' => $alloc ? [['id' => 900 + $sel, 'deposit_id' => 40, 'envelope_id' => $sel, 'account_id' => null, 'amount' => $s($alloc), 'date' => date('Y-m-01'), 'deposit_note' => 'Salary', 'created_by' => 7]] : [],
            'members' => $overview['members'],
        ] : null,
    ]);
}

$routes = [
    '/api/login' => ['token' => '1|fake', 'expires_at' => null, 'user' => ['id' => 7, 'name' => 'Hudson', 'email' => 'demo@example.com', 'verified' => true, 'is_admin' => false]],
    '/api/logout' => [],
    '/api/dashboard/budgets' => [
        ['id' => 3, 'name' => 'Our home', 'currency' => 'ZAR', 'cycle_start_day' => 1, 'role' => 'owner', 'premium' => ['active' => true], 'paused' => false],
        ['id' => 4, 'name' => 'Holiday house', 'currency' => 'ZAR', 'cycle_start_day' => 1, 'role' => 'member', 'premium' => ['active' => false], 'paused' => false],
    ],
    '/api/dashboard/budgets/3/overview' => array_replace($overview, ['automatic_ready' => array_map(fn ($i) => ['id' => $i['id'], 'name' => $i['name'], 'amount' => $i['open_run']['amount']], $autoReady)]),
    '/api/dashboard/budgets/4/overview' => array_replace($overview, ['automatic_ready' => [], 'summary' => array_replace($overview['summary'], ['unallocated' => '0.00', 'overspent' => [], 'left_to_spend' => '3120.00'])]),
    '/api/dashboard/budgets/3/add' => [
        'envelopes' => $envelopes,
        'accounts' => array_values(array_filter($accounts, fn ($a) => $a['type'] !== 'investment')),
        'envelope_use' => [['envelope_id' => 1, 'uses' => 14], ['envelope_id' => 3, 'uses' => 8], ['envelope_id' => 2, 'uses' => 6], ['envelope_id' => 4, 'uses' => 3]],
    ],
];

$routes['/api/dashboard/budgets/4/add'] = $routes['/api/dashboard/budgets/3/add'];

if (! array_key_exists($path, $routes)) { return $answer(['message' => 'Not in the fake API: '.$path], 404); }

return $answer($routes[$path]);
