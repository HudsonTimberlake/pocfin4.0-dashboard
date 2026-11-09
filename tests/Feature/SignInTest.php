<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Signing in through the API, the email codes, and what the browser is (and isn't) given. */
class SignInTest extends TestCase
{
    private function fakeLogin(array $user = [], bool $adminCode = false): void
    {
        Http::fake([
            'api.test/api/login' => Http::response([
                'token' => '5|web-token',
                'expires_at' => '2026-11-09T20:00:00+00:00',
                'user' => ['id' => 7, 'name' => 'Thandi', 'email' => 'thandi@example.com', 'verified' => true, 'is_admin' => $adminCode, ...$user],
                'admin_code_required' => $adminCode,
            ]),
            'api.test/api/admin/code' => Http::response(['expires_in_minutes' => 10], 202),
            'api.test/api/email/resend' => Http::response(['retry_after' => 60], 202),
        ]);
    }

    public function test_signing_in_keeps_the_token_on_the_server_only(): void
    {
        $this->fakeLogin();

        $response = $this->withHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130.0 Safari/537.36')
            ->post('/sign-in', ['email' => 'thandi@example.com', 'password' => 'secret', 'timezone' => 'Africa/Johannesburg']);

        $response->assertRedirect('/');
        $this->assertSame('5|web-token', Crypt::decryptString(session('api_token')));
        $this->assertSame('Africa/Johannesburg', session('timezone'));
        $this->assertStringNotContainsString('web-token', implode(' ', $response->headers->all('set-cookie')));

        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/login'
            && $r['client'] === 'web'
            && $r['device_name'] === 'Dashboard · Chrome on Mac'
            && $r->hasHeader('X-Dashboard-Key', 'dash-key')
            && $r->hasHeader('X-Dashboard-Client-Ip', '127.0.0.1'));
    }

    public function test_a_wrong_password_shows_the_apis_message(): void
    {
        Http::fake(['api.test/api/login' => Http::response(['message' => 'x', 'errors' => ['email' => ['That email and password don\'t match.']]], 422)]);

        $this->from('/sign-in')->post('/sign-in', ['email' => 'thandi@example.com', 'password' => 'nope'])
            ->assertRedirect('/sign-in')
            ->assertSessionHasErrors(['email' => 'That email and password don\'t match.']);
        $this->assertNull(session('api_token'));
    }

    public function test_an_admin_must_enter_the_emailed_code(): void
    {
        $this->fakeLogin(adminCode: true);

        $this->post('/sign-in', ['email' => 'thandi@example.com', 'password' => 'secret'])->assertRedirect('/code');
        $this->assertSame('admin', session('pending_code'));
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/admin/code');

        // Until then, every page sends them back to the code.
        $this->get('/')->assertRedirect('/code');
        $this->get('/code')->assertOk()->assertSee('Check your email');

        Http::fake(['api.test/api/admin/code/verify' => Http::response(null, 204)]);
        $this->post('/code', ['code' => '123456'])->assertRedirect('/');
        $this->assertNull(session('pending_code'));
    }

    public function test_an_unverified_account_confirms_its_email_first(): void
    {
        $this->fakeLogin(['verified' => false]);

        $this->post('/sign-in', ['email' => 'thandi@example.com', 'password' => 'secret'])->assertRedirect('/code');
        $this->assertSame('verify', session('pending_code'));

        Http::fake(['api.test/api/email/verify' => Http::response(['message' => 'x', 'errors' => ['code' => ['That code isn’t right.']]], 422)]);
        $this->from('/code')->post('/code', ['code' => '000000'])->assertSessionHasErrors('code');
    }

    public function test_signing_out_revokes_the_token(): void
    {
        Http::fake(['api.test/api/logout' => Http::response(null, 204)]);

        $this->signedIn()->post('/sign-out')->assertRedirect('/sign-in');
        $this->assertNull(session('api_token'));
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/logout' && $r->hasHeader('Authorization', 'Bearer 1|secret-token'));
    }

    public function test_an_expired_sign_in_goes_back_to_sign_in(): void
    {
        Http::fake(['api.test/api/*' => Http::response(['message' => 'Unauthenticated.'], 401)]);

        $this->signedIn()->get('/')->assertRedirect('/sign-in');
        $this->assertNull(session('api_token'));
    }

    public function test_pages_need_signing_in(): void
    {
        $this->get('/')->assertRedirect('/sign-in');
        $this->get('/admin/users')->assertRedirect('/sign-in');
    }

    public function test_forgot_password_keeps_the_email_out_of_the_address(): void
    {
        Http::fake(['api.test/api/forgot-password' => Http::response(null, 202)]);

        $this->post('/forgot-password', ['email' => 'thandi@example.com'])->assertRedirect('/reset-password');
        $this->get('/reset-password')->assertOk()->assertSee('thandi@example.com');

        Http::fake(['api.test/api/reset-password' => Http::response(null, 204)]);
        $this->post('/reset-password', ['code' => '123456', 'password' => 'new-secret-1', 'password_confirmation' => 'new-secret-1'])
            ->assertRedirect('/sign-in');
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/reset-password' && $r['token'] === '123456' && $r['email'] === 'thandi@example.com');
    }
}
