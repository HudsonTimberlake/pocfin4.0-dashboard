<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Api;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * A1 and A2: users, for support. Account and Premium only. Every change sends the admin's password,
 * which the API checks, and the API writes it to the admin log.
 */
class UserController extends Controller
{
    public function __construct(private Api $api) {}

    public function index(Request $request): View
    {
        $filters = session('admin_filters', []);
        $list = $this->api->json('/admin/users', array_filter([
            'q' => $filters['q'] ?? null,
            'filter' => $filters['filter'] ?? null,
            'page' => max(1, (int) $request->query('page', 1)),
        ]));

        return view('admin.users', ['list' => $list, 'filters' => $filters]);
    }

    /** The search goes in the session, so emails never sit in the address bar or the server logs. */
    public function filter(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'filter' => ['nullable', 'in:subscribers,premium,unverified'],
        ]);
        $request->session()->put('admin_filters', array_filter($data));

        return redirect()->route('admin.users');
    }

    public function show(int $user): View
    {
        $response = $this->api->get("/admin/users/$user");
        abort_if($response->notFound(), 404);

        return view('admin.user', ['u' => $this->api->ok($response)->json()]);
    }

    public function premium(Request $request, int $user): RedirectResponse
    {
        $data = $request->validate([
            'budget_id' => ['required', 'integer'],
            'action' => ['required', 'in:months,until,forever,end'],
            'months' => ['required_if:action,months', 'nullable', 'in:1,3,6,12'],
            'until' => ['required_if:action,until', 'nullable', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string', 'max:120'],
            'password' => ['required', 'string'],
        ]);

        $this->api->ok($this->api->post("/admin/premium/budgets/{$data['budget_id']}", array_filter([
            'action' => $data['action'],
            'months' => $data['action'] === 'months' ? (int) $data['months'] : null,
            'until' => $data['action'] === 'until' ? $data['until'] : null,
            'note' => $data['note'] ?? null,
            'password' => $data['password'],
        ], fn ($v) => $v !== null)));

        return redirect()->route('admin.user', $user)->with('status', 'Premium changed and logged.');
    }

    public function sync(Request $request, int $user): RedirectResponse
    {
        $password = $request->validate(['password' => ['required', 'string']])['password'];
        $response = $this->api->post("/admin/users/$user/subscription/sync", ['password' => $password]);

        if ($response->status() === 503) {
            return back()->with('status', 'Couldn’t reach the store. Try again in a moment.');
        }

        $this->api->ok($response);

        return back()->with('status', 'Checked with the store.');
    }

    public function verification(Request $request, int $user): RedirectResponse
    {
        $password = $request->validate(['password' => ['required', 'string']])['password'];
        $this->api->ok($this->api->post("/admin/users/$user/verification", ['password' => $password]));

        return back()->with('status', 'A new verification code is on its way to them.');
    }

    /**
     * Devices and the breach lock: sign out one device or all, lock or unlock. One form, the button
     * pressed says which; the API checks the password, refuses an admin's own account and logs it.
     */
    public function access(Request $request, int $user): RedirectResponse
    {
        $data = $request->validate([
            'do' => ['required', 'string', 'regex:/^(device:\d+|all|lock|unlock)$/'],
            'note' => ['nullable', 'string', 'max:120'],
            'password' => ['required', 'string'],
        ]);
        [$path, $done] = match (true) {
            str_starts_with($data['do'], 'device:') => ["/admin/users/$user/devices/".substr($data['do'], 7).'/sign-out', 'That device is signed out.'],
            $data['do'] === 'all' => ["/admin/users/$user/devices/sign-out", 'Signed out everywhere. They can sign in again.'],
            $data['do'] === 'lock' => ["/admin/users/$user/lock", 'Account locked and signed out everywhere. No sign-in works until you unlock it.'],
            default => ["/admin/users/$user/unlock", 'Account unlocked. They can sign in again.'],
        };

        $this->api->ok($this->api->post($path, array_filter(['note' => $data['note'] ?? null, 'password' => $data['password']], fn ($v) => $v !== null)));

        return redirect()->route('admin.user', $user)->with('status', $done);
    }
}
