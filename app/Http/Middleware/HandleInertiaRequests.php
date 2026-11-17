<?php

namespace App\Http\Middleware;

use App\Services\Shell;
use Illuminate\Http\Request;
use Inertia\Middleware;

/**
 * Version 2 pages (Inertia + React, design/dashboard-v2.md). What every signed-in React page
 * gets around it: the person, their budgets and the one they're on, the appearance choice, and
 * the CSRF token for the few plain forms (sign out, lock). Never the API token.
 */
class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'inertia';

    public function share(Request $request): array
    {
        $signedIn = $request->session()->has('api_token');

        return [
            ...parent::share($request),
            'me' => fn () => $signedIn ? [
                'name' => $request->session()->get('user.name'),
                'email' => $request->session()->get('user.email'),
                'isAdmin' => $request->session()->get('user.is_admin') === true,
            ] : null,
            'budgets' => fn () => $signedIn ? array_map(fn (array $b) => [
                'id' => $b['id'],
                'name' => $b['name'],
                'initials' => Shell::initials($b['name']),
                'role' => $b['role'] ?? 'member',
                'premium' => (bool) ($b['premium']['active'] ?? false),
                'paused' => (bool) ($b['paused'] ?? false),
            ], app(Shell::class)->budgets()) : [],
            'budgetId' => fn () => $signedIn ? (app(Shell::class)->budget()['id'] ?? null) : null,
            'appearance' => self::appearance($request),
            'idleMinutes' => (int) config('dashboard.idle_minutes'),
            'csrf' => fn () => csrf_token(),
            'status' => fn () => $request->session()->get('status'),
            // What was just saved (expense, refund, income, move, changed), for the Saved tick.
            'saved' => fn () => $request->session()->get('saved'),
        ];
    }

    /** system, light or dark: this browser's choice, kept in a plain cookie (it holds nothing else). */
    public static function appearance(Request $request): string
    {
        $value = $request->cookie('appearance');

        return in_array($value, ['light', 'dark'], true) ? $value : 'system';
    }
}
