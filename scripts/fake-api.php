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
        ],
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
    foreach ($state['accounts'] as &$a) { if ($a['id'] === (int) $m[2]) { $a['balance'] += ($body['type'] === 'add' ? 1 : -1) * $c($body['amount'] ?? '0'); } }
    unset($a);
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

usort($state['envelopes'], fn ($a, $b) => ($a['sort'] ?? $a['id']) <=> ($b['sort'] ?? $b['id']));
$envelopes = array_map(fn ($e) => ['id' => $e['id'], 'name' => $e['name'], 'icon' => $e['icon'] ?? null, 'budgeted_amount' => $s($e['target']), 'kind' => $e['kind'], 'balance' => $s($e['balance']), 'sort_order' => $e['sort'] ?? $e['id'], 'archived' => (bool) ($e['archived'] ?? false), 'built_up_snoozed_through' => null], $state['envelopes']);
$left = array_sum(array_column($state['envelopes'], 'balance'));
$spent = array_sum(array_column($state['envelopes'], 'spent'));
$byId = array_column($state['envelopes'], null, 'id');
$top = array_values(array_filter($state['envelopes'], fn ($e) => $e['spent'] > 0 && $e['name'] !== 'Rent' && $e['name'] !== 'Phone and internet'));
usort($top, fn ($a, $b) => $b['spent'] <=> $a['spent']);
$accounts = array_map(fn ($a) => ['id' => $a['id'], 'name' => $a['name'], 'type' => $a['type'], 'visibility' => 'shared', 'created_by' => 7, 'balance' => $s($a['balance']), 'value' => isset($a['value']) ? $s($a['value']) : null, 'gain' => $a['gain']], $state['accounts']);
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
    '/api/dashboard/budgets/3/overview' => $overview,
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
