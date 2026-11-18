<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Pages behind sign-in. Someone still owing an email code finishes that first. */
class SignedIn
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('api_token')) {
            if ($request->isMethod('GET') && ! $request->expectsJson()) {
                $request->session()->put('url.intended', $request->fullUrl());
            }

            return leave(route('sign-in'));
        }

        if ($request->session()->has('pending_code')) {
            return leave(route('code'));
        }

        return $next($request);
    }
}
