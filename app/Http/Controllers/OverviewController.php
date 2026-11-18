<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * W2 Overview (version 2, design/dashboard-v2.md): "Am I OK this month?" first, then what needs
 * you, envelopes, recent and the small tiles. One dashboard call, rendered by React.
 */
class OverviewController extends Controller
{
    public function show(Api $api, Shell $shell): Response
    {
        $b = $shell->budgetId();
        // One call, to the dashboard's own endpoint (API: Dashboard/OverviewPageController).
        $o = $api->json("/dashboard/budgets/$b/overview");

        $tz = session('timezone', 'Africa/Johannesburg');
        $end = Carbon::parse($o['summary']['cycle']['end'] ?? now($tz), $tz)->startOfDay();
        $daysLeft = max(0, (int) now($tz)->startOfDay()->diffInDays($end, false) + 1);

        return Inertia::render('Overview', [
            'summary' => $o['summary'] ?? [],
            'envelopes' => $o['envelopes'] ?? [],
            'accounts' => array_map(fn (array $a) => ['id' => $a['id'], 'type' => $a['type'], 'gain' => $a['gain'] ?? null], $o['accounts'] ?? []),
            'expenses' => $o['expenses'] ?? [],
            'streak' => $o['streak'] ?? null,
            'left_from' => isset($o['left_from']) ? ['note' => $o['left_from']['note'] ?? null, 'date' => $o['left_from']['date']] : null,
            'members' => array_map(fn (array $m) => ['id' => $m['id'], 'name' => $m['name'], 'role' => $m['role'] ?? 'member'], $o['members'] ?? []),
            'goals' => array_map(fn (array $g) => ['id' => $g['id'], 'name' => $g['name'], 'status' => $g['status'] ?? 'active', 'state' => $g['state'] ?? null], $o['goals'] ?? []),
            'automatic_ready' => array_map(fn (array $a) => ['id' => $a['id'], 'name' => $a['name'], 'amount' => $a['amount']], $o['automatic_ready'] ?? []),
            'daysLeft' => $daysLeft,
        ]);
    }
}
