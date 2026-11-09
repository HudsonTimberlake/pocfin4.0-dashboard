<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** The admin pages, for admin emails only. The API checks every admin call again, this only hides the pages. */
class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->session()->get('user.is_admin') === true, 404);

        return $next($request);
    }
}
