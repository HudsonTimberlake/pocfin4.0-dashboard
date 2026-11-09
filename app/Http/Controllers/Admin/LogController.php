<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Api;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** A4 Admin log: every admin change and sign-in, newest first. */
class LogController extends Controller
{
    public function index(Request $request, Api $api): View
    {
        return view('admin.log', ['list' => $api->json('/admin/log', ['page' => max(1, (int) $request->query('page', 1))])]);
    }
}
