<?php

namespace App\Http\Controllers;

use App\Services\Api;
use App\Services\Shell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** D7 Profile and security, and D10 Delete account. */
class AccountController extends Controller
{
    public function __construct(private Api $api) {}

    public function show(): View
    {
        return view('pages.account', ['sessions' => $this->api->json('/user/sessions')['data'] ?? []]);
    }

    public function profile(Request $request): RedirectResponse
    {
        $name = $request->validate(['name' => ['required', 'string', 'max:255']])['name'];
        $user = $this->api->ok($this->api->patch('/user', ['name' => $name]))->json();
        $request->session()->put('user', [...session('user', []), ...$user]);

        return back()->with('status', 'Saved.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed'],
        ]);

        $this->api->ok($this->api->put('/user/password', [
            ...$data, 'password_confirmation' => $request->input('password_confirmation'),
        ]));

        return back()->with('status', 'Password changed. Your other devices are signed out.');
    }

    public function signOutOthers(): RedirectResponse
    {
        $this->api->ok($this->api->delete('/user/sessions/others'));

        return back()->with('status', 'Signed out everywhere else.');
    }

    public function showDelete(Shell $shell): View
    {
        $subscription = $this->api->json('/subscription');

        return view('pages.delete', [
            'subscription' => $subscription,
            'budgets' => $shell->budgets(),
            'blocked' => session('delete_blocked'),
        ]);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'string'], 'understood' => ['accepted']], [
            'understood.accepted' => 'Tick the box to say you understand.',
        ]);

        $response = $this->api->delete('/user', ['password' => $request->input('password')]);

        // The API's blocker (owns a shared budget, or private money in one) is shown as its own card.
        if ($response->status() === 422 && $response->json('errors.user')) {
            return back()->with('delete_blocked', $response->json('errors.user.0'));
        }

        $this->api->ok($response);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('sign-in')->with('status', 'Your account has been deleted.');
    }
}
