<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Locks the page after a while without use (the web's App lock): the visitor stays signed in but
 * enters their password to carry on. `idle:admin` uses the admin pages' shorter time.
 */
class IdleLock
{
    public function handle(Request $request, Closure $next, ?string $kind = null): Response
    {
        $session = $request->session();
        $minutes = (int) config($kind === 'admin' ? 'dashboard.admin_idle_minutes' : 'dashboard.idle_minutes');
        $last = (int) $session->get('last_activity', time());

        if ($session->get('locked') || time() - $last > $minutes * 60) {
            $session->put('locked', true);
            $session->put('url.intended', $request->fullUrl());

            return redirect()->route('lock');
        }

        $session->put('last_activity', time());

        return $next($request);
    }
}
