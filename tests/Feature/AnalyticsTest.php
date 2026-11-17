<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** W15 Analytics: one call for the tab shown; another month by date; Premium said in place. */
class AnalyticsTest extends TestCase
{
    public function test_month_by_date_and_a_tab(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/budgets/3/analytics*' => fn (Request $r) => Http::response([
                'tab' => $r->data()['tab'] ?? 'month', 'premium_required' => ($r->data()['tab'] ?? 'month') === 'insights',
                'month' => ($r->data()['tab'] ?? 'month') === 'month' ? ['cycle' => ['start' => '2026-10-01', 'end' => '2026-10-31'], 'kept' => '2450.00'] : null,
                'trends' => null, 'insights' => null,
            ]),
        ]);

        $this->signedIn()->get('/analytics?date=2026-10-15')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Analytics')->where('tab', 'month')->where('month.kept', '2450.00')->where('premium_required', false));
        $this->get('/analytics?tab=insights&date=2026-10-15')->assertInertia(fn (AssertableInertia $page) => $page->where('tab', 'insights')->where('premium_required', true));
        $this->get('/analytics?tab=everything&date=soon')->assertInertia(fn (AssertableInertia $page) => $page->where('tab', 'month'));

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/analytics') && ($r->data()['date'] ?? null) === '2026-10-15' && ($r->data()['tab'] ?? null) === 'month');
        // A date only travels with the Month tab, and a made-up one never does.
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/analytics') && ($r->data()['tab'] ?? null) === 'insights' && ! array_key_exists('date', $r->data()));
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/analytics') && ($r->data()['date'] ?? null) === 'soon');
    }

    public function test_an_insight_can_open_new_automatic(): void
    {
        Http::fake([
            'api.test/api/dashboard/budgets' => Http::response(self::budgets()),
            'api.test/api/dashboard/budgets/3/automatic*' => Http::response(['data' => [], 'ready' => [], 'ready_count' => 0, 'selected' => null, 'envelopes' => [], 'accounts' => [], 'members' => []]),
        ]);

        $this->signedIn()->get('/automatic?new=1')->assertInertia(fn (AssertableInertia $page) => $page->component('Automatic')->where('start_new', true));
    }
}
