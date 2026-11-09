@php
    use App\Support\Money;
    $s = $o['summary'] ?? [];
    $live = collect($envelopes)->reject(fn ($e) => $e['archived'] ?? false);
    $leftCents = Money::cents($s['left_to_spend'] ?? '0');
    $allocCents = max(1, Money::cents($s['allocated'] ?? '0'));
    $fill = max(0, min(100, intdiv(max(0, $leftCents) * 100, $allocCents)));
    $streak = $o['streak'] ?? null;
    $recent = collect($o['expenses'] ?? [])->take(6);
    $end = \Illuminate\Support\Carbon::parse($s['cycle']['end'] ?? now());
    $daysLeft = max(0, (int) now(session('timezone', 'Africa/Johannesburg'))->startOfDay()->diffInDays($end->startOfDay(), false) + 1);
@endphp
<x-layouts.app title="Overview">
    <header class="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div class="min-w-[280px] flex-1">
            <h1 class="h1">Overview</h1>
            <p class="sub mt-0.5">This cycle: {{ day($s['cycle']['start'] ?? null, false) }} to {{ day($s['cycle']['end'] ?? null, false) }} · {{ $daysLeft }} {{ $daysLeft === 1 ? 'day' : 'days' }} left</p>
        </div>
        <p class="flex h-9 items-center gap-2 rounded-full bg-navy-tint px-3.5 text-[13.5px] font-bold text-navy-ink"><x-icon name="phone" :size="18" class="text-navy"/>To add or allocate, use the PocFin app</p>
    </header>

    <div class="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
        <div class="flex min-w-0 flex-col gap-5">
            <section aria-label="Left to spend" class="hero flex flex-wrap items-center gap-6 px-8">
                <div class="min-w-[240px] flex-1">
                    <div class="text-[15px] font-bold text-slate">Left to spend</div>
                    <div class="num mt-1 text-[clamp(40px,6vw,60px)] leading-[1.13] font-extrabold tracking-[-0.035em] {{ $leftCents < 0 ? 'text-red' : '' }}">{{ money_big($s['left_to_spend'] ?? '0') }}</div>
                    <div class="sub mt-1.5">Across {{ $live->count() }} {{ $live->count() === 1 ? 'envelope' : 'envelopes' }}</div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        @if (($streak['current'] ?? 0) > 0)<span class="chip bg-tint px-3 py-1 text-[13.5px] text-teal">{{ $streak['current'] }}-week streak</span>@endif
                        @if (count($s['overspent'] ?? []) > 0)<span class="chip bg-red-tint px-3 py-1 text-[13.5px] text-red-ink">{{ count($s['overspent']) }} {{ count($s['overspent']) === 1 ? 'envelope' : 'envelopes' }} overspent</span>@endif
                    </div>
                </div>
                <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Pocket gauge, {{ $fill }}% of this cycle’s money left">
                    <defs><clipPath id="pocket"><path d="M25 30h100v45a50 50 0 0 1-100 0z"/></clipPath></defs>
                    <path d="M25 30h100v45a50 50 0 0 1-100 0z" fill="#E6F8F5"/>
                    <rect x="20" y="{{ 125 - (95 * $fill / 100) }}" width="110" height="{{ 95 * $fill / 100 + 5 }}" fill="#03C7AA" clip-path="url(#pocket)"/>
                    <path d="M25 30h100v45a50 50 0 0 1-100 0z" fill="none" stroke="#1E1E1E" stroke-width="5" stroke-linejoin="round"/>
                </svg>
            </section>

            <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
                <div class="rounded-[20px] bg-tint px-5 py-[18px]">
                    <div class="text-sm font-bold text-teal">Ready to allocate</div>
                    <div class="num mt-1 text-[26px] font-extrabold tracking-[-0.02em]">{{ money_big($s['unallocated'] ?? '0') }}</div>
                    @if ($o['left_from'] ?? null)<div class="mt-0.5 text-[13px] text-[#3E5B57]">From {{ $o['left_from']['note'] ?: 'a deposit' }}, {{ day($o['left_from']['date'], false) }}</div>@endif
                </div>
                <div class="rounded-[20px] bg-white px-5 py-[18px]">
                    <div class="text-sm font-bold text-slate">Spent this cycle</div>
                    <div class="num mt-1 text-[26px] font-extrabold tracking-[-0.02em]">{{ money_big($s['spent'] ?? '0') }}</div>
                    @if (! Money::isZero($s['refunded'] ?? '0'))<div class="mt-0.5 text-[13px] text-slate">{{ money($s['refunded']) }} refunded</div>@endif
                </div>
                <div class="rounded-[20px] bg-white px-5 py-[18px]">
                    <div class="text-sm font-bold text-slate">Allocated this cycle</div>
                    <div class="num mt-1 text-[26px] font-extrabold tracking-[-0.02em]">{{ money_big($s['allocated'] ?? '0') }}</div>
                </div>
            </div>

            <section aria-labelledby="tc" class="card px-7">
                <div class="flex items-baseline justify-between gap-3"><h2 id="tc" class="h2">Top categories</h2><a href="{{ route('budget') }}" class="link text-[14.5px]">All envelopes</a></div>
                <div class="mt-[18px] flex flex-col gap-4">
                    @forelse ($s['top_categories'] ?? [] as $c)
                        @php
                            $env = $c['envelope_id'] ? ($envelopes[$c['envelope_id']] ?? null) : null;
                            $target = $env['budgeted_amount'] ?? null;
                            $over = $c['balance'] !== null && Money::isNegative($c['balance']);
                        @endphp
                        <div>
                            <div class="flex justify-between gap-3 text-[15px] font-bold">
                                <span class="truncate">{{ $c['name'] }}</span>
                                <span class="num {{ $over ? 'text-red' : '' }}">{{ money($c['spent']) }} @if ($target && ! Money::isZero($target))<span class="font-semibold text-slate">of {{ money($target) }}</span>@endif</span>
                            </div>
                            <div class="bar mt-2 {{ $over ? 'over' : '' }}"><i style="width: {{ $over ? 100 : ($target ? Money::percent($c['spent'], $target) : 100) }}%"></i></div>
                        </div>
                    @empty
                        <p class="sub">Nothing spent yet this cycle.</p>
                    @endforelse
                </div>
            </section>

            <section aria-labelledby="ac" class="rounded-3xl bg-navy px-7 py-6 text-white">
                <div class="flex items-baseline justify-between gap-3"><h2 id="ac" class="h2">Accounts</h2><a href="{{ route('accounts') }}" class="text-[14.5px] font-bold text-mint-light">See accounts</a></div>
                <div class="num mt-2 text-4xl font-extrabold tracking-[-0.03em]">{{ money_big($s['accounts']['total'] ?? '0') }}</div>
                <div class="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))]">
                    @foreach (['savings' => 'Savings', 'holding' => 'Holding', 'investments' => 'Investments'] as $key => $label)
                        <div class="rounded-2xl bg-white/8 px-4 py-3.5"><div class="text-[13.5px] font-bold text-navy-soft">{{ $label }}</div><div class="num mt-0.5 text-lg font-extrabold">{{ money($s['accounts'][$key] ?? '0') }}</div></div>
                    @endforeach
                </div>
                <p class="mt-4 text-sm text-navy-soft">Total tracked, with envelopes and Ready to allocate: <b class="num text-white">{{ money($s['total_tracked'] ?? '0') }}</b></p>
            </section>
        </div>

        <div class="flex min-w-0 flex-col gap-5">
            <section aria-labelledby="ra" class="rounded-3xl bg-white pt-6 pb-3">
                <div class="flex items-baseline justify-between gap-3 px-7"><h2 id="ra" class="h2">Recent spending</h2><a href="{{ route('history') }}" class="link text-[14.5px]">All history</a></div>
                <div class="mt-3">
                    @forelse ($recent as $x)
                        <div class="flex items-center gap-3 border-t border-rule px-7 py-[11px]">
                            <x-who :member="$members[$x['created_by']] ?? null" :members="$members"/>
                            <div class="min-w-0 flex-1"><div class="truncate text-[15px] font-bold">{{ $x['note'] ?: ($envelopes[$x['envelope_id']]['name'] ?? 'Spent') }}</div><div class="text-[13px] text-slate">{{ $envelopes[$x['envelope_id']]['name'] ?? '' }}{{ $x['refund'] ? ' · refund' : '' }} · {{ day($x['date']) }}</div></div>
                            <div class="num text-[15px] font-extrabold {{ $x['refund'] ? 'text-teal' : '' }}">{{ $x['refund'] ? '+' : '' }}{{ money($x['amount']) }}</div>
                        </div>
                    @empty
                        <p class="sub border-t border-rule px-7 pt-4">No spending yet.</p>
                    @endforelse
                </div>
            </section>

            @if ($streak)
                <section aria-labelledby="st" class="card px-7">
                    <h2 id="st" class="h2">{{ $streak['current'] }} {{ $streak['current'] === 1 ? 'week' : 'weeks' }} in a row</h2>
                    <p class="mt-1 text-[14.5px] text-slate">Best: {{ $streak['best'] }} {{ $streak['best'] === 1 ? 'week' : 'weeks' }}.</p>
                    @php $weeks = $streak['weeks'] ?? []; @endphp
                    <div class="mt-4 grid gap-[5px]" style="grid-template-columns: repeat({{ max(1, count($weeks)) }}, minmax(0, 1fr))" role="img" aria-label="Last {{ count($weeks) }} weeks">
                        @foreach ($weeks as $w)
                            <span class="h-[26px] rounded-[7px] {{ match ($w['state'] ?? $w['status'] ?? '') { 'counted' => 'bg-mint', 'rest' => 'bg-amber-line', 'current' => ($streak['this_week_counted'] ?? false) ? 'bg-mint ring-2 ring-ink ring-inset' : 'bg-line ring-2 ring-ink ring-inset', default => 'bg-line' } }}"></span>
                        @endforeach
                    </div>
                    <div class="mt-2.5 flex flex-wrap gap-3.5 text-[12.5px] text-slate">
                        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-mint"></span>Counted</span>
                        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-amber-line"></span>Rest week</span>
                        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px] bg-line"></span>Missed</span>
                    </div>
                </section>
            @endif

            @foreach (array_slice($s['overspent'] ?? [], 0, 3) as $os)
                <section class="flex items-center gap-3.5 rounded-3xl bg-red-tint px-6 py-5">
                    <span class="grid size-10 flex-none place-items-center rounded-full bg-white text-red"><x-icon name="warning" :stroke="2"/></span>
                    <div class="min-w-0 flex-1"><h2 class="text-base font-extrabold">{{ $os['name'] }} is over by {{ money($os['amount']) }}</h2><p class="mt-0.5 text-sm text-[#6B3236]">Move money to it in the app, or let next cycle cover it.</p></div>
                </section>
            @endforeach
        </div>
    </div>
</x-layouts.app>
