<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** The idle lock, the response headers, admin pages, and what happens when the API is down. */
class SecurityTest extends TestCase
{
    public function test_pages_are_never_cached_or_framed(): void
    {
        $response = $this->get('/sign-in')->assertOk();

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
        $this->assertStringContainsString("frame-ancestors 'none'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString("script-src 'self'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringNotContainsString('unsafe-eval', $response->headers->get('Content-Security-Policy'));
    }

    public function test_it_locks_after_fifteen_minutes_without_use(): void
    {
        $this->signedIn(session: ['last_activity' => time() - 16 * 60])->get('/budget')->assertRedirect('/lock');
        $this->assertTrue(session('locked'));
        $this->get('/lock')->assertOk()->assertSee('Locked while you were away');
    }

    public function test_unlocking_checks_the_password_with_the_api(): void
    {
        Http::fake(['api.test/api/user/password/check' => Http::sequence()
            ->push(['message' => 'x', 'errors' => ['password' => ['Your password is incorrect.']]], 422)
            ->push(null, 204)]);
        $this->signedIn(session: ['locked' => true])->from('/lock')->post('/lock', ['password' => 'wrong'])->assertSessionHasErrors('password');
        $this->assertTrue(session('locked'));

        $this->post('/lock', ['password' => 'right'])->assertRedirect('/');
        $this->assertNull(session('locked'));
    }

    public function test_admin_pages_are_404_for_everyone_else(): void
    {
        $this->signedIn()->get('/admin/users')->assertNotFound();
        $this->signedIn()->get('/admin/log')->assertNotFound();
    }

    public function test_admin_pages_lock_sooner(): void
    {
        $this->signedIn(['is_admin' => true], ['last_activity' => time() - 11 * 60])->get('/admin/users')->assertRedirect('/lock');
    }

    public function test_the_api_asking_for_the_admin_code_sends_them_to_it(): void
    {
        Http::fake(['api.test/api/admin/users*' => Http::response(['code' => 'admin_code_required'], 403)]);

        $this->signedIn(['is_admin' => true])->get('/admin/users')->assertRedirect('/code');
        $this->assertSame('admin', session('pending_code'));
    }

    public function test_a_calm_page_when_the_api_is_down(): void
    {
        Http::fake(['api.test/api/*' => Http::response('', 500)]);

        $this->signedIn()->get('/')->assertStatus(503)->assertSee('We can’t reach PocFin right now');
    }
}
