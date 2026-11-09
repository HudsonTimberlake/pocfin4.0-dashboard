@php
    use App\Support\Money;
    $sub = $subscription;
    $active = $sub['active'] ?? false;
    $store = $sub['store'] ?? null;
    $storeName = $store === 'play_store' ? 'Google Play' : 'the App Store';
    $manage = config('dashboard.manage_urls.'.($store === 'play_store' ? 'play_store' : 'app_store'));
    $period = str_contains((string) ($sub['product'] ?? ''), 'year') || str_contains((string) ($sub['product'] ?? ''), 'annual') ? 'Yearly · R399.99 a year' : 'Monthly · R39.99 a month';
    $covered = collect($sub['budgets'] ?? [])->where('covered', true)->count();
    $what = [
        'initial_purchase' => 'First payment', 'renewal' => 'Renewal', 'product_change' => 'Changed plan', 'cancellation' => 'Cancelled',
        'uncancellation' => 'Turned back on', 'expiration' => 'Ended', 'billing_issue' => 'Payment problem', 'non_renewing_purchase' => 'One-off purchase',
        'subscription_paused' => 'Paused', 'transfer' => 'Moved between accounts',
    ];
    $grant = fn ($g) => match (true) {
        $g['source'] === 'referral' => '1 free month'.($g['from'] ? ' · '.$g['from'].' joined with a code' : ''),
        $g['action'] === 'months' => $g['months'].' '.($g['months'] === 1 ? 'month' : 'months').' from PocFin',
        $g['action'] === 'forever' => 'Premium for good',
        $g['action'] === 'until' => 'Premium until '.day($g['until'], false),
        $g['action'] === 'end' => 'Premium ended',
        default => 'Change',
    };
@endphp
<x-layouts.app title="Premium">
    <header><h1 class="h1">Premium</h1><p class="sub mt-0.5">Budgeting together, past recaps and receipt photos</p></header>
    <div class="flex max-w-[1040px] flex-col gap-5">
        <x-status/>
        @if ($active)
            <section aria-labelledby="sb" class="flex flex-wrap items-end gap-6 rounded-[28px] bg-navy px-8 py-7 text-white">
                <div class="min-w-[280px] flex-1">
                    <div class="text-sm font-bold text-mint-light">Your subscription</div>
                    <h2 id="sb" class="mt-1.5 text-[30px] leading-9 font-extrabold tracking-[-0.02em]">{{ $period }}</h2>
                    <p class="mt-1.5 text-[15px] text-navy-soft">{{ ($sub['renews'] ?? false) ? 'Renews on' : 'Ends on' }} {{ day($sub['until'], false) }} · bought in {{ $storeName }}</p>
                    <div class="mt-[18px] flex flex-wrap gap-6">
                        <div><div class="num text-[26px] font-extrabold">{{ $events['months_paid'] ?? 0 }}</div><div class="text-[13.5px] font-bold text-navy-soft">months paid</div></div>
                        @if ($events['since'] ?? null)<div><div class="text-[26px] font-extrabold">{{ \Illuminate\Support\Carbon::parse($events['since'])->format('M Y') }}</div><div class="text-[13.5px] font-bold text-navy-soft">subscriber since</div></div>@endif
                        <div><div class="num text-[26px] font-extrabold">{{ $covered }} of {{ $sub['max_budgets'] ?? 3 }}</div><div class="text-[13.5px] font-bold text-navy-soft">budgets covered</div></div>
                    </div>
                </div>
                <div class="flex flex-col items-start gap-2">
                    <a href="{{ $manage }}" target="_blank" rel="noopener" class="inline-flex h-[46px] items-center gap-2 rounded-[14px] bg-white px-[18px] text-[15px] font-bold text-navy">Manage in {{ $storeName }}<x-icon name="external" :size="16" :stroke="2.2"/></a>
                    <span class="text-[13px] text-navy-soft">Change plan or cancel there. We can’t from here.</span>
                </div>
            </section>

            <form method="POST" action="{{ route('premium.covered') }}" aria-labelledby="cv" class="card px-7">
                @csrf
                <h2 id="cv" class="h2">Budgets your subscription covers</h2>
                <p class="mt-0.5 text-sm text-slate">Up to {{ $sub['max_budgets'] ?? 3 }} budgets you own. Everyone in a covered budget gets Premium in it.</p>
                <div class="mt-3">
                    @foreach ($sub['budgets'] ?? [] as $b)
                        <label class="flex items-center gap-3.5 border-t border-rule py-3.5">
                            <input type="checkbox" name="budget_ids[]" value="{{ $b['id'] }}" @checked($b['covered']) class="size-[22px] accent-teal">
                            <span class="flex-1 text-[15.5px] font-bold">{{ $b['name'] }}</span>
                            @if ($b['covered'])<span class="chip bg-tint text-teal">Covered</span>@endif
                        </label>
                    @endforeach
                </div>
                @error('budget_ids')<p class="field-error">{{ $message }}</p>@enderror
                <button class="btn mt-3">Save</button>
            </form>
        @else
            <section class="rounded-[28px] bg-[linear-gradient(165deg,#F2FCFA_0%,#DDF4EF_60%,#C4EBE3_100%)] px-8 py-7">
                <h2 class="text-[26px] font-extrabold tracking-[-0.02em]">No subscription</h2>
                <p class="mt-2 max-w-[560px] text-[15.5px] leading-[23px] text-[#3E5B57]">Premium is R39.99 a month or R399.99 a year, with a 7-day free trial, and covers up to 3 budgets you own. Subscribe in the PocFin app, from Premium in Profile.</p>
            </section>
        @endif

        @if ($events['data'] ?? [])
            <section aria-labelledby="py" class="rounded-3xl bg-white pt-6 pb-2">
                <div class="px-7"><h2 id="py" class="h2">Payments</h2><p class="mt-0.5 text-sm text-slate">As the store reported them to us. Receipts come from the store.</p></div>
                <div class="mt-3 overflow-x-auto">
                    <table class="table min-w-[560px]">
                        <thead><tr><th scope="col">Date</th><th scope="col">What happened</th><th scope="col">Covers</th><th scope="col" class="r">Amount</th></tr></thead>
                        <tbody>
                            @foreach ($events['data'] as $e)
                                <tr>
                                    <td class="text-slate">{{ day($e['occurred_at'], false) }}</td>
                                    <td class="font-bold">{{ $e['period_type'] === 'trial' ? 'Free trial started' : ($what[$e['type']] ?? ucfirst(str_replace('_', ' ', $e['type']))) }}</td>
                                    <td class="text-slate">{{ $e['period_type'] === 'trial' ? '7 days' : ($e['months'] ? day($e['period_start'], false).' to '.day($e['period_end'], false) : '') }}</td>
                                    <td class="r font-extrabold">{{ $e['price'] !== null ? ($e['currency'] === 'ZAR' || ! $e['currency'] ? money($e['price']) : $e['currency'].' '.$e['price']) : '' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </section>
        @endif

        <section aria-labelledby="pb" class="card px-7">
            <h2 id="pb" class="h2">Premium in each budget</h2>
            <div class="mt-3.5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
                @foreach ($budgets as $b)
                    @php $p = $b['premium_detail'] ?? $b['premium']; @endphp
                    <div class="rounded-[18px] bg-canvas px-5 py-[18px]">
                        <div class="flex items-baseline justify-between gap-2.5"><span class="text-base font-extrabold">{{ $b['name'] }}</span>
                            <span class="chip {{ ($p['active'] ?? false) ? 'bg-mint' : 'bg-white text-slate' }}">{{ ($p['active'] ?? false) ? 'Premium' : 'Free' }}</span></div>
                        <p class="mt-1 text-[13.5px] text-slate">
                            @if ($p['forever'] ?? false) Premium for good
                            @elseif ($p['until'] ?? null) {{ ($p['active'] ?? false) ? 'Until' : 'Ended' }} {{ day($p['until'], false) }}@if ($p['subscription'] ?? null) · {{ $p['subscription']['name'] }}’s subscription @endif
                            @else Free @endif
                        </p>
                        @if ($p['history'] ?? [])
                            <div class="mt-3.5 flex flex-col gap-2 text-sm">
                                @foreach (array_slice($p['history'], 0, 4) as $g)
                                    <div class="flex justify-between gap-2.5"><span>{{ $grant($g) }}</span><span class="text-slate">{{ day($g['created_at'], false) }}</span></div>
                                @endforeach
                            </div>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>
    </div>
</x-layouts.app>
