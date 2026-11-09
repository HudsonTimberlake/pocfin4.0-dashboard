<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** The admin pages: account-level support, and every change carries the admin's password. */
class AdminPagesTest extends TestCase
{
    private function admin(): static
    {
        return $this->signedIn(['is_admin' => true, 'name' => 'Hudson', 'email' => 'owner@example.com']);
    }

    private function fakeUser(): void
    {
        Http::fake([
            'api.test/api/budgets' => Http::response(self::budgets()),
            'api.test/api/admin/users/9' => Http::response([
                'user' => ['id' => 9, 'name' => 'Sipho Dlamini', 'email' => 'sipho@example.com', 'joined_at' => '2026-10-31', 'verified' => false, 'plan' => 'premium', 'subscriber' => false, 'premium_budgets' => 1, 'budgets_count' => 1, 'app_platform' => 'ios', 'app_version' => '4.0.4', 'last_seen_at' => '2026-11-09T08:52:00+00:00', 'referral_code' => 'SIPHO7', 'invited_by' => ['id' => 1, 'name' => 'Hudson'], 'friends_invited' => 0, 'sessions' => 1],
                'subscription' => ['active' => false, 'until' => null, 'renews' => false, 'store' => null, 'product' => null, 'period' => null, 'synced_at' => null, 'covered_budget_ids' => [], 'months_paid' => 0, 'since' => null, 'data' => []],
                'budgets' => [['id' => 30, 'name' => 'Sipho’s budget', 'role' => 'owner', 'members_count' => 1, 'premium' => ['active' => true, 'status' => 'premium', 'until' => '2026-12-02', 'forever' => false], 'history' => [['id' => 1, 'source' => 'referral', 'action' => 'months', 'months' => 1, 'until' => '2026-12-02', 'forever' => false, 'from' => null, 'created_at' => '2026-11-02T00:00:00+00:00', 'note' => null, 'granted_by' => null]], 'owner' => ['id' => 9, 'name' => 'Sipho Dlamini']]],
                'support' => [['id' => 4, 'kind' => 'Something’s not working', 'status' => 'answered', 'messages_count' => 2, 'created_at' => '2026-11-09T06:12:00+00:00', 'last_message_at' => '2026-11-09T08:40:00+00:00']],
                'log' => [],
            ]),
        ]);
    }

    public function test_the_users_list_with_search_kept_out_of_the_address(): void
    {
        Http::fake([
            'api.test/api/budgets' => Http::response(self::budgets()),
            'api.test/api/admin/users*' => Http::response(['data' => [['id' => 9, 'name' => 'Sipho Dlamini', 'email' => 'sipho@example.com', 'joined_at' => '2026-10-31', 'verified' => true, 'plan' => 'subscriber', 'app_platform' => 'ios', 'app_version' => '4.0.4', 'last_seen_at' => null]], 'current_page' => 1, 'last_page' => 1, 'total' => 1, 'counts' => ['all' => 1284, 'subscribers' => 96, 'unverified' => 12]]),
        ]);

        $this->admin()->post('/admin/users', ['q' => 'sipho@example.com'])->assertRedirect('/admin/users');
        $this->get('/admin/users')->assertOk()->assertSee('1,284 people')->assertSee('Subscriber')->assertSee('iOS 4.0.4');
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/admin/users') && ($r->data()['q'] ?? null) === 'sipho@example.com');
    }

    public function test_one_user_shows_no_money(): void
    {
        $this->fakeUser();

        $this->admin()->get('/admin/users/9')->assertOk()
            ->assertSee('Sipho Dlamini')
            ->assertSee('Premium until 2 Dec')
            ->assertSee('Send a new verification code')
            ->assertSee('Change Premium')
            ->assertSee('Envelopes, amounts, transactions, notes and receipts are never shown here.');
    }

    public function test_changing_premium_sends_the_password(): void
    {
        Http::fake(['api.test/api/admin/premium/budgets/30' => Http::response(['id' => 30])]);

        $this->admin()->post('/admin/users/9/premium', ['budget_id' => 30, 'action' => 'months', 'months' => '3', 'note' => 'Sorry', 'password' => 'admin-pass'])
            ->assertRedirect('/admin/users/9');

        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/admin/premium/budgets/30'
            && $r['action'] === 'months' && $r['months'] === 3 && $r['password'] === 'admin-pass' && ! isset($r['until']));
    }

    public function test_a_wrong_password_shows_on_the_form(): void
    {
        Http::fake(['api.test/api/admin/premium/budgets/30' => Http::response(['message' => 'x', 'errors' => ['password' => ['Your password is incorrect.']]], 422)]);

        $this->admin()->from('/admin/users/9')->post('/admin/users/9/premium', ['budget_id' => 30, 'action' => 'forever', 'password' => 'nope'])
            ->assertRedirect('/admin/users/9')->assertSessionHasErrors(['password' => 'Your password is incorrect.']);
    }

    public function test_support_inbox_and_reply(): void
    {
        Http::fake([
            'api.test/api/budgets' => Http::response(self::budgets()),
            'api.test/api/admin/support/threads/4/messages' => Http::response(['id' => 4], 201),
            'api.test/api/admin/support/threads/4' => Http::response(['id' => 4, 'subject' => 'Account or Premium', 'status' => 'open', 'created_at' => '2026-11-09T07:14:00+00:00', 'user' => ['id' => 9, 'name' => 'Ayesha Patel', 'email' => 'a@example.com'],
                'messages' => [['id' => 1, 'from_admin' => false, 'author' => 'Ayesha Patel', 'body' => 'My husband says our budget is paused.', 'device' => ['app_version' => '4.0.4', 'platform' => 'ios', 'os_version' => '26.1', 'device_model' => 'iPhone 15'], 'attachments' => [['id' => 70, 'mime' => 'image/png']], 'created_at' => '2026-11-09T07:14:00+00:00']],
                'about' => ['joined_at' => '2026-09-28', 'verified' => true, 'app_version' => '4.0.4', 'app_platform' => 'ios', 'budgets' => [['id' => 31, 'name' => 'Our budget', 'role' => 'owner', 'members_count' => 2, 'premium' => 'free']]]]),
            'api.test/api/admin/support/threads*' => Http::response(['data' => [['id' => 4, 'kind' => 'account', 'subject' => 'Account or Premium', 'status' => 'open', 'preview' => 'My husband says…', 'last_from_admin' => false, 'unread' => true, 'last_message_at' => '2026-11-09T07:14:00+00:00', 'created_at' => '2026-11-09T07:14:00+00:00', 'user' => ['id' => 9, 'name' => 'Ayesha Patel', 'email' => 'a@example.com']]], 'counts' => ['open' => 1, 'answered' => 12]]),
            'api.test/api/support/attachments/70' => Http::response('png-bytes', 200, ['Content-Type' => 'image/png']),
        ]);

        $this->admin()->get('/admin/support')->assertOk()
            ->assertSee('Ayesha Patel')->assertSee('My husband says our budget is paused.')->assertSee('PocFin 4.0.4 · iPhone 15 · iOS 26.1')->assertSee('About Ayesha');
        $this->get('/admin/support/attachments/70')->assertOk()->assertHeader('Content-Type', 'image/png');

        $this->post('/admin/support/4/reply', ['body' => 'Fixed it.', 'password' => 'admin-pass'])->assertRedirect();
        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.test/api/admin/support/threads/4/messages' && $r['body'] === 'Fixed it.' && $r['password'] === 'admin-pass');
    }

    public function test_the_log(): void
    {
        Http::fake([
            'api.test/api/budgets' => Http::response(self::budgets()),
            'api.test/api/admin/log*' => Http::response(['data' => [['id' => 1, 'action' => 'premium_months', 'admin' => 'Hudson', 'user' => ['id' => 9, 'name' => 'Sipho Dlamini', 'email' => 's@example.com'], 'details' => ['budget' => 'Sipho’s budget', 'until' => '2027-03-02'], 'note' => 'Sorry for the bug', 'created_at' => '2026-11-09T09:02:00+00:00']], 'current_page' => 1, 'last_page' => 1]),
        ]);

        $this->admin()->get('/admin/log')->assertOk()->assertSee('Premium months')->assertSee('until 2 Mar 2027')->assertSee('Sorry for the bug');
    }
}
