<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Every page renders from the API's real response shapes, and shows money as rand. */
class PagesTest extends TestCase
{
    private function envelope(int $id, string $name, string $balance, string $kind = 'everyday', string $target = '6000.00'): array
    {
        return ['id' => $id, 'name' => $name, 'icon' => null, 'budgeted_amount' => $target, 'kind' => $kind, 'balance' => $balance, 'sort_order' => $id, 'archived' => false, 'built_up_snoozed_through' => null];
    }

    private function summary(): array
    {
        return [
            'cycle' => ['start' => '2026-11-01', 'end' => '2026-11-30', 'start_day' => 1],
            'spent' => '17759.05', 'refunded' => '349.00', 'allocated' => '21600.00', 'left_to_spend' => '8420.50', 'unallocated' => '1250.00',
            'accounts' => ['savings' => '42300.00', 'holding' => '3100.00', 'investments' => '141540.12', 'total' => '186940.12'],
            'total_tracked' => '196610.62',
            'overspent' => [['envelope_id' => 2, 'name' => 'Eating out', 'amount' => '180.40']],
            'top_categories' => [
                ['envelope_id' => 1, 'account_id' => null, 'name' => 'Groceries', 'spent' => '4508.65', 'refunded' => '349.00', 'balance' => '1840.35'],
                ['envelope_id' => 2, 'account_id' => null, 'name' => 'Eating out', 'spent' => '1380.40', 'refunded' => '0.00', 'balance' => '-180.40'],
            ],
        ];
    }

    private function expense(int $id, string $amount, bool $refund = false, bool $receipt = false): array
    {
        return ['id' => $id, 'envelope_id' => 1, 'amount' => $amount, 'refund' => $refund, 'date' => '2026-11-09', 'note' => 'Weekly shop', 'has_receipt' => $receipt, 'receipt_version' => null, 'created_by' => 8];
    }

    private function fakeBudget(): void
    {
        $envelopes = [$this->envelope(1, 'Groceries', '1840.35'), $this->envelope(2, 'Eating out', '-180.40', target: '1200.00'), $this->envelope(3, 'Holiday', '1500.00', 'saving_up', '400.00')];
        $accounts = [
            ['id' => 11, 'name' => 'Emergency fund', 'type' => 'savings', 'visibility' => 'shared', 'created_by' => 7, 'balance' => '42300.00', 'value' => null, 'gain' => null],
            ['id' => 12, 'name' => 'Long-term investments', 'type' => 'investment', 'visibility' => 'shared', 'created_by' => 7, 'balance' => '129129.57', 'value' => '141540.12', 'gain' => '12410.55'],
        ];

        $expenses = ['data' => [$this->expense(1, '842.30', receipt: true), $this->expense(2, '349.00', true)], 'current_page' => 1, 'last_page' => 2, 'from' => 1, 'to' => 25, 'total' => 30];
        $deposits = ['data' => [['id' => 40, 'amount' => '22850.00', 'allocated' => '21600.00', 'unallocated' => '1250.00', 'date' => '2026-11-01', 'note' => 'Salary', 'created_by' => 7]], 'current_page' => 1, 'last_page' => 1, 'from' => 1, 'to' => 1, 'total' => 1];
        $transfers = ['data' => [['id' => 50, 'from_envelope_id' => 3, 'from_account_id' => null, 'from_private_account' => false, 'to_envelope_id' => null, 'to_account_id' => 12, 'to_private_account' => false, 'amount' => '400.00', 'date' => '2026-11-02', 'note' => null, 'created_by' => 7]], 'current_page' => 1, 'last_page' => 1, 'from' => 1, 'to' => 1, 'total' => 1];

        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/budgets/3/overview' => Http::response([
                'members' => self::members(),
                'summary' => $this->summary(), 'envelopes' => $envelopes, 'accounts' => $accounts,
                'expenses' => [$this->expense(1, '842.30'), $this->expense(2, '349.00', true)], 'deposits' => [], 'transfers' => [],
                'streak' => ['current' => 6, 'best' => 9, 'this_week_counted' => true, 'weeks' => [['start' => '2026-11-02', 'status' => 'counted'], ['start' => '2026-11-09', 'status' => 'current']]],
                'left_from' => ['id' => 40, 'amount' => '22850.00', 'allocated' => '21600.00', 'unallocated' => '1250.00', 'date' => '2026-11-01', 'note' => 'Salary', 'created_by' => 7],
                'envelope_use' => [],
            ]),
            'api.test/api/dashboard/budgets/3/history*' => fn (Request $r) => Http::response([
                'tab' => $r->data()['tab'] ?? 'spent',
                'list' => ['spent' => $expenses, 'income' => $deposits, 'moved' => $transfers][$r->data()['tab'] ?? 'spent'],
                'envelopes' => $envelopes, 'accounts' => $accounts, 'members' => self::members(),
            ]),
            'api.test/api/dashboard/budgets/3/budget*' => Http::response([
                'summary' => $this->summary(),
                'envelopes' => [
                    [...$envelopes[0], 'allocated_this_cycle' => '6000.00', 'spent_this_cycle' => '4508.65', 'refunded_this_cycle' => '349.00'],
                    ...array_map(fn ($e) => [...$e, 'allocated_this_cycle' => '0.00', 'spent_this_cycle' => '0.00', 'refunded_this_cycle' => '0.00'], array_slice($envelopes, 1)),
                ],
                'selected_id' => $envelopes[0]['id'],
                'activity' => [
                    'spent' => [$this->expense(1, '842.30'), $this->expense(2, '349.00', true)],
                    'allocated' => [['id' => 1, 'deposit_id' => 40, 'envelope_id' => 1, 'account_id' => null, 'private_account' => false, 'amount' => '6000.00', 'date' => '2026-11-01', 'created_by' => 7]],
                    'members' => self::members(),
                ],
            ]),
            'api.test/api/dashboard/budgets/3/accounts*' => Http::response([
                'accounts' => $accounts, 'summary' => $this->summary(), 'members' => self::members(), 'selected_id' => 12,
                'holdings' => [['id' => 21, 'account_id' => 12, 'name' => 'S&P 500 ETF', 'value' => '86210.40', 'last_valuation' => ['date' => '2026-11-01', 'value' => '84710.40'], 'positions' => [['id' => 1, 'purpose_id' => 5, 'purpose' => 'Retirement', 'value' => '86210.40']]]],
                'purposes' => [['id' => 5, 'name' => 'Retirement', 'net_contributed' => '78000.00', 'value' => '86210.40', 'gain' => '8210.40', 'simple_return' => '10.53']],
                'returns' => ['21' => ['holding_id' => 21, 'period' => [], 'net_contributed' => '78000.00', 'value' => '86210.40', 'gain' => '8210.40', 'simple_return' => '10.53', 'time_weighted_return' => '12.40', 'positions' => []]],
                'allocations' => ['data' => []],
                'transactions' => ['data' => [['id' => 60, 'account_id' => 12, 'type' => 'add', 'amount' => '200.00', 'date' => '2026-10-02', 'note' => 'Interest', 'created_by' => 7]]],
                'transfers' => ['data' => []],
            ]),
        ]);
    }

    public function test_overview(): void
    {
        $this->fakeBudget();

        $this->signedIn()->get('/')->assertOk()
            ->assertSee('R8,420<span class="cents">.50</span>', false)
            ->assertSee('R1,250')
            ->assertSee('From Salary')
            ->assertSee('6 weeks in a row')
            ->assertSee('Eating out is over by R180.40')
            ->assertSee('+R349.00')
            ->assertSee('R196,610.62')
            ->assertDontSee('1|secret-token');

        Http::assertSent(fn (Request $r) => $r->hasHeader('Authorization', 'Bearer 1|secret-token') && $r->hasHeader('X-Timezone', 'Africa/Johannesburg'));
    }

    public function test_budget_table_and_the_chosen_envelope(): void
    {
        $this->fakeBudget();

        $this->signedIn()->get('/budget?envelope=1')->assertOk()
            ->assertSee('Everyday')->assertSee('Saving up')
            ->assertSee('−R180.40')
            ->assertSee('R4,508.65')
            ->assertSee('Allocated');
    }

    public function test_history_search_never_goes_in_the_address(): void
    {
        $this->fakeBudget();

        $this->signedIn()->post('/history', ['q' => 'shop', 'tab' => 'spent'])->assertRedirect('/history?tab=spent');
        $this->assertSame(['q' => 'shop'], session('history_filters'));

        $this->get('/history?tab=spent')->assertOk()->assertSee('30 found')->assertSee('Refund')->assertSee('Open receipt photo')->assertSee('Older');
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/dashboard/budgets/3/history') && ($r->data()['q'] ?? null) === 'shop' && ($r->data()['tab'] ?? null) === 'spent');

        $this->get('/history?tab=income')->assertOk()->assertSee('Salary');
        $this->get('/history?tab=moved')->assertOk()->assertSee('Holiday → Long-term investments');
    }

    public function test_accounts_with_returns(): void
    {
        $this->fakeBudget();

        $this->signedIn()->get('/accounts')->assertOk()
            ->assertSee('S&amp;P 500 ETF', false)
            ->assertSee('12.40%')
            ->assertSee('+R12,410.55')
            ->assertSee('Retirement')
            ->assertSee('Interest');
    }

    public function test_recaps(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/budgets/3/recaps*' => Http::response(['cycles' => [['start' => '2026-10-01', 'end' => '2026-10-31', 'seen' => false]], 'locked_count' => 2, 'start' => '2026-10-01', 'premium_required' => false, 'recap' => [
                'cycle' => ['start' => '2026-10-01', 'end' => '2026-10-31'], 'deposits' => '22850.00', 'spent' => '19140.40', 'refunded' => '220.00',
                'kept' => '3929.60', 'spent_net' => '18920.40', 'to_accounts' => ['savings' => '1000.00', 'holding' => '0.00', 'investment' => '1500.00', 'total' => '2500.00'],
                'investing' => ['current' => 5], 'transactions' => ['count' => 55, 'by_member' => [['user_id' => 7, 'name' => 'Thandi', 'count' => 31], ['user_id' => 8, 'name' => 'Sipho', 'count' => 24]]],
                'within_budget' => ['count' => 8, 'of' => 10], 'streak_weeks' => 6,
                'envelopes' => [['id' => 2, 'name' => 'Eating out', 'kind' => 'everyday', 'budgeted_amount' => '1200.00', 'balance_start' => '0.00', 'balance_end' => '-140.00', 'balance_now' => '-180.40', 'spent' => '1340.00', 'within_budget' => false, 'within_budget_cycles' => 3]],
            ]]),
        ]);

        $this->signedIn()->get('/recaps')->assertOk()
            ->assertSee('You kept more than you spent')
            ->assertSee('8 of 10 envelopes')
            ->assertSee('−R140.00')
            ->assertSee('2 older recaps with Premium')
            ->assertSee('Who recorded what');
    }

    public function test_account_and_delete(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/user/sessions' => Http::response(['data' => [
                ['id' => 1, 'name' => 'Dashboard · Chrome on Mac', 'client' => 'web', 'created_at' => '2026-11-09T08:00:00+00:00', 'last_used_at' => '2026-11-09T08:40:00+00:00', 'expires_at' => '2026-11-09T20:00:00+00:00', 'current' => true],
                ['id' => 2, 'name' => 'iPhone 16', 'client' => 'app', 'created_at' => '2026-10-01T08:00:00+00:00', 'last_used_at' => null, 'expires_at' => null, 'current' => false],
            ]]),
            'api.test/api/subscription' => Http::response(['active' => true, 'until' => '2027-07-14T00:00:00+00:00', 'renews' => true, 'store' => 'app_store', 'product' => 'pocfin_premium_yearly', 'period' => 'normal', 'max_budgets' => 3, 'budgets' => [['id' => 3, 'name' => 'Our home', 'covered' => true]]]),
            'api.test/api/user' => Http::response(['message' => 'x', 'errors' => ['user' => ['Make another member the owner of Our home first.']]], 422),
        ]);

        $this->signedIn()->get('/account')->assertOk()->assertSee('This browser')->assertSee('PocFin app · iPhone 16');
        $this->get('/account/delete')->assertOk()->assertSee('Your subscription doesn’t stop by itself');

        $this->from('/account/delete')->post('/account/delete', ['password' => 'secret', 'understood' => '1'])->assertRedirect('/account/delete');
        $this->get('/account/delete')->assertSee('Make another member the owner of Our home first.');
        $this->assertNotNull(session('api_token'));
    }

    public function test_deleting_signs_out(): void
    {
        Http::fake(['api.test/api/user' => Http::response(null, 204)]);

        $this->signedIn()->post('/account/delete', ['password' => 'secret', 'understood' => '1'])->assertRedirect('/sign-in');
        $this->assertNull(session('api_token'));
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE' && $r['password'] === 'secret');
    }

    public function test_premium_and_invite(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/premium' => Http::response([
                'subscription' => ['active' => true, 'until' => '2027-07-14T00:00:00+00:00', 'renews' => true, 'store' => 'app_store', 'product' => 'pocfin_premium_yearly', 'period' => 'normal', 'max_budgets' => 3, 'budgets' => [['id' => 3, 'name' => 'Our home', 'covered' => true]]],
                'events' => ['months_paid' => 16, 'since' => '2026-03-07T00:00:00+00:00', 'data' => [
                ['id' => 1, 'type' => 'product_change', 'store' => 'app_store', 'product' => 'pocfin_premium_yearly', 'period_type' => 'normal', 'price' => '399.99', 'currency' => 'ZAR', 'months' => 12, 'period_start' => '2026-07-14T00:00:00+00:00', 'period_end' => '2027-07-14T00:00:00+00:00', 'occurred_at' => '2026-07-14T00:00:00+00:00'],
            ]],
                'budgets' => ['3' => ['active' => true, 'status' => 'premium', 'until' => '2027-07-14', 'forever' => false, 'history' => [['id' => 1, 'source' => 'referral', 'action' => 'months', 'months' => 1, 'until' => null, 'from' => 'Sipho', 'note' => null, 'created_at' => '2026-11-01T08:00:00+00:00']]]],
            ]),
            'api.test/api/referrals' => Http::response(['code' => 'THANDI4', 'link' => 'https://pocfin.com/r/THANDI4', 'months' => 1, 'max_months_ahead' => 12, 'budget' => ['id' => 3, 'name' => 'Our home'], 'months_earned' => 1, 'friends' => [['name' => 'Sipho', 'joined_at' => '2026-10-31', 'rewarded' => true]]]),
        ]);

        $this->signedIn()->get('/premium')->assertOk()
            ->assertSee('Yearly · R399.99 a year')->assertSee('16')->assertSee('Manage in the App Store')
            ->assertSee('R399.99')->assertSee('Sipho joined with a code');
        $this->get('/invite')->assertOk()->assertSee('THANDI4')->assertSee('Free month earned');
    }
}
