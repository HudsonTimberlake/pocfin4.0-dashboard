<?php

/*
 * dashboard.pocfin.com (design/dashboard.md). The dashboard has no database: it signs in to the
 * PocFin API for the visitor and keeps that sign-in in an encrypted, server-side session.
 */
return [
    // The API's base address, ending in /api.
    'api_url' => rtrim((string) env('POCFIN_API_URL', 'https://api.pocfin.com/api'), '/'),

    // Shared with the API's DASHBOARD_KEY, so it trusts the visitor's address we pass on for its rate limits.
    'key' => env('DASHBOARD_KEY'),

    // true writes one log line per API call with how long it took (storage/logs). Off normally.
    'log_timing' => (bool) env('DASHBOARD_LOG_TIMING', false),

    // Minutes without use before the page locks and asks for the password again. Admin pages lock sooner.
    'idle_minutes' => 15,
    'admin_idle_minutes' => 10,

    // The stores' own pages for managing a subscription. The web never sells or cancels one.
    'manage_urls' => [
        'app_store' => 'https://apps.apple.com/account/subscriptions',
        'play_store' => 'https://play.google.com/store/account/subscriptions',
    ],

    'site_url' => 'https://pocfin.com',

    /*
     * The one list of API paths the dashboard may call (fnmatch patterns; * matches anything). Its
     * own endpoints are /dashboard/*, in the API's app/Http/Controllers/Dashboard: nothing the
     * app uses is changed for them. Anything not here is refused (an exception in development
     * and tests, a log line in production), so a new call can't slip in unnoticed.
     */
    'api_paths' => [
        'dashboard' => ['/dashboard/*'],

        // Shared by nature: signing in, passwords, the email code, sessions, the signed-in person.
        'shared' => [
            '/login', '/logout', '/forgot-password', '/reset-password', '/email/*',
            '/user', '/user/*', '/subscription', '/subscription/*', '/referrals', '/referrals/*',
            '/support/attachments/*',
            // A receipt photo, streamed through this app so the browser never needs the token.
            '/budgets/*/expenses/*/receipt',
        ],

        // Admin only in practice (the API gives everyone else a 404).
        'admin' => ['/admin/*'],
    ],
];
