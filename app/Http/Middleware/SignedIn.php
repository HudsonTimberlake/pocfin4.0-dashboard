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
            return redirect()->guest(route('sign-in'));
        }

        if ($request->session()->has('pending_code')) {
            return redirect()->route('code');
        }

        return $next($request);
    }
}
