<?php

namespace App\Http\Controllers;

use App\Services\Api;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

/**
 * Signing in, the email code (a new account's verification, and every admin sign-in), resetting a
 * password, the lock screen and signing out. New accounts are made in the app.
 */
class AuthController extends Controller
{
    public function __construct(private Api $api) {}

    public function showSignIn(Request $request): View|RedirectResponse
    {
        if ($request->session()->has('api_token') && ! $request->session()->has('pending_code')) {
            return redirect()->route('overview');
        }

        return view('auth.sign-in');
    }

    public function signIn(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'timezone' => ['nullable', 'string', 'max:64', 'timezone:all'],
        ]);

        $response = $this->api->post('/login', [
            'email' => $data['email'],
            'password' => $data['password'],
            'device_name' => $this->deviceName($request),
            'client' => 'web',
        ], signedIn: false);

        if ($response->status() === 429) {
            throw ValidationException::withMessages(['email' => ['Too many tries. Wait a minute, then try again.']]);
        }

        $this->api->ok($response);

        $request->session()->regenerate();
        $request->session()->forget('budgets_cache');
        Api::storeToken($response->json('token'));
        $user = $response->json('user');
        $request->session()->put([
            'user' => $user,
            'expires_at' => $response->json('expires_at'),
            'timezone' => $data['timezone'] ?? 'Africa/Johannesburg',
            'last_activity' => time(),
        ]);

        if (! ($user['verified'] ?? false)) {
            $request->session()->put('pending_code', 'verify');
            $this->api->post('/email/resend');
        } elseif ($response->json('admin_code_required')) {
            $request->session()->put('pending_code', 'admin');
            $this->api->post('/admin/code');
        }

        return $request->session()->has('pending_code')
            ? redirect()->route('code')
            : redirect()->intended(route('overview'));
    }

    public function showCode(Request $request): View|RedirectResponse
    {
        if (! $request->session()->has('pending_code')) {
            return redirect()->route($request->session()->has('api_token') ? 'overview' : 'sign-in');
        }

        return view('auth.code', ['email' => session('user.email')]);
    }

    public function checkCode(Request $request): RedirectResponse
    {
        $mode = $request->session()->get('pending_code') ?? abort(404);
        $code = $request->validate(['code' => ['required', 'digits:6']])['code'];

        if ($mode === 'verify') {
            $this->api->ok($this->api->post('/email/verify', ['code' => $code]));
            $request->session()->put('user.verified', true);

            if (session('user.is_admin')) {
                $request->session()->put('pending_code', 'admin');
                $this->api->post('/admin/code');

                return redirect()->route('code')->with('status', 'Email confirmed. We’ve sent a second code for admin sign-in.');
            }
        } else {
            $this->api->ok($this->api->post('/admin/code/verify', ['code' => $code, 'device' => $this->deviceName($request)]));
        }

        $request->session()->forget('pending_code');
        $request->session()->put('last_activity', time());

        return redirect()->intended(route('overview'));
    }

    public function resendCode(Request $request): RedirectResponse
    {
        $mode = $request->session()->get('pending_code') ?? abort(404);
        $response = $this->api->post($mode === 'verify' ? '/email/resend' : '/admin/code');

        return back()->with('status', match (true) {
            $response->status() === 429 => 'Wait a minute before asking for another code.',
            $response->successful() => 'We’ve sent a new code.',
            default => 'The email couldn’t be sent. Try again in a moment.',
        });
    }

    public function showForgot(): View
    {
        return view('auth.forgot');
    }

    /** Always says the same, so the page can't be used to find out who has an account. */
    public function forgot(Request $request): RedirectResponse
    {
        $email = $request->validate(['email' => ['required', 'string', 'email', 'max:255']])['email'];
        $this->api->post('/forgot-password', ['email' => $email], signedIn: false);
        $request->session()->put('reset_email', $email);

        return redirect()->route('reset');
    }

    public function showReset(Request $request): View|RedirectResponse
    {
        return $request->session()->has('reset_email')
            ? view('auth.reset', ['email' => session('reset_email')])
            : redirect()->route('forgot');
    }

    public function reset(Request $request): RedirectResponse
    {
        $email = $request->session()->get('reset_email') ?? abort(404);
        $data = $request->validate([
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'confirmed'],
        ]);

        $this->api->ok($this->api->post('/reset-password', [
            'email' => $email,
            'token' => $data['code'],
            'password' => $data['password'],
            'password_confirmation' => $request->input('password_confirmation'),
        ], signedIn: false), ['token' => 'code']);

        $request->session()->forget('reset_email');

        return redirect()->route('sign-in')->with('status', 'Password changed. Sign in with your new one.');
    }

    public function showLock(Request $request): View|RedirectResponse
    {
        if (! $request->session()->has('api_token')) {
            return redirect()->route('sign-in');
        }

        return view('auth.lock', ['name' => session('user.name')]);
    }

    public function unlock(Request $request): RedirectResponse
    {
        abort_unless($request->session()->has('api_token'), 404);
        $password = $request->validate(['password' => ['required', 'string']])['password'];

        $response = $this->api->post('/user/password/check', ['password' => $password]);

        if ($response->status() === 429) {
            throw ValidationException::withMessages(['password' => ['Too many tries. Wait a minute, then try again.']]);
        }

        $this->api->ok($response);
        $request->session()->forget('locked');
        $request->session()->put('last_activity', time());

        return redirect()->intended(route('overview'));
    }

    public function lockNow(Request $request): RedirectResponse
    {
        $request->session()->put('locked', true);

        return redirect()->route('lock');
    }

    public function signOut(Request $request): RedirectResponse
    {
        if ($request->session()->has('api_token')) {
            try {
                $this->api->request()->post('/logout');
            } catch (\Throwable) {
                // Signed out here whatever the API says; the web sign-in expires by itself anyway.
            }
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('sign-in')->with('status', 'You’re signed out.');
    }

    /** "Dashboard · Chrome on Mac", for Where you're signed in. */
    private function deviceName(Request $request): string
    {
        $agent = (string) $request->userAgent();
        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Safari/') => 'Safari',
            default => 'a browser',
        };
        $os = match (true) {
            str_contains($agent, 'iPhone'), str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'Mac OS') => 'Mac',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Linux') => 'Linux',
            default => null,
        };

        return 'Dashboard · '.$browser.($os ? " on $os" : '');
    }
}
