<?php

namespace App\Providers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // One of each per request, so the budgets list is fetched once however many views ask.
        $this->app->scoped(Api::class);
        $this->app->scoped(Shell::class);
    }

    public function boot(): void
    {
        View::composer(['components.layouts.app', 'partials.nav', 'pages.*'], fn ($view) => $view->with('shell', app(Shell::class)));
    }
}
