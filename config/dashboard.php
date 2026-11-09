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

    // Minutes without use before the page locks and asks for the password again. Admin pages lock sooner.
    'idle_minutes' => 15,
    'admin_idle_minutes' => 10,

    // The stores' own pages for managing a subscription. The web never sells or cancels one.
    'manage_urls' => [
        'app_store' => 'https://apps.apple.com/account/subscriptions',
        'play_store' => 'https://play.google.com/store/account/subscriptions',
    ],

    'site_url' => 'https://pocfin.com',
];
