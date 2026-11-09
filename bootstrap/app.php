<?php

use App\Exceptions\AdminCodeRequired;
use App\Exceptions\ApiUnavailable;
use App\Exceptions\SignedOut;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\IdleLock;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SignedIn;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [SecurityHeaders::class]);
        $middleware->alias([
            'signed.in' => SignedIn::class,
            'idle' => IdleLock::class,
            'admin.only' => AdminOnly::class,
        ]);
        // No trustProxies: on shared hosting nothing sits in front, and trusting X-Forwarded-For
        // would let a visitor pick the address the API's rate limits count.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (SignedOut $e, Request $request) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('sign-in')->with('status', 'You’ve been signed out. Sign in again to carry on.');
        });
        $exceptions->render(function (AdminCodeRequired $e, Request $request) {
            $request->session()->put('pending_code', 'admin');

            return redirect()->route('code');
        });
        $exceptions->render(fn (ApiUnavailable $e) => response()->view('errors.api', [], 503));
    })->create();
