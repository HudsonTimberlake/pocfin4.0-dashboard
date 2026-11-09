@php
    use App\Support\Money;
    $r = $recap;
    $month = fn ($start) => \Illuminate\Support\Carbon::parse($start)->format('F Y');
    $keptMore = $r && ! Money::isNegative($r['kept']);
@endphp
<x-layouts.app title="Recaps">
    <header class="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div class="min-w-[280px] flex-1"><h1 class="h1">Recaps</h1><p class="sub mt-0.5">One for each finished cycle</p></div>
        @if ($r)<button type="button" data-print class="btn-quiet no-print"><x-icon name="printer"/>Print</button>@endif
    </header>

    @if (! $cycles)
        <div class="card"><p class="sub">Your first recap comes at the end of your first full cycle.</p></div>
    @else
        <div class="flex flex-wrap items-start gap-5">
            <nav aria-label="Recaps" class="no-print max-w-full flex-[1_1_220px] rounded-3xl bg-white p-2.5">
                @foreach ($cycles as $c)
                    <a href="{{ route('recaps', ['cycle' => $c['start']]) }}" @if ($c['start'] === $start) aria-current="page" @endif class="flex h-[52px] items-center gap-2.5 rounded-[14px] px-3.5 {{ $c['start'] === $start ? 'bg-tint-soft' : '' }}">
                        <span class="flex-1"><span class="block text-[15px] font-bold">{{ $month($c['start']) }}</span><span class="block text-[12.5px] text-slate">{{ day($c['start'], false) }} to {{ day($c['end'], false) }}</span></span>
                        @unless ($c['seen'])<span class="chip bg-mint">New</span>@endunless
                    </a>
                @endforeach
                @if ($lockedCount > 0)
                    <a href="{{ route('premium') }}" class="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[13.5px] text-slate"><x-icon name="lock" :size="16"/>{{ $lockedCount }} older {{ $lockedCount === 1 ? 'recap' : 'recaps' }} with Premium</a>
                @endif
            </nav>

            @if ($r)
                <article aria-labelledby="rt" class="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
                    <section class="flex flex-wrap items-center gap-6 rounded-[28px] bg-[linear-gradient(165deg,#F2FCFA_0%,#DDF4EF_60%,#C4EBE3_100%)] px-9 py-8">
                        <div class="min-w-[280px] flex-1">
                            <div class="text-[15px] font-bold text-teal">{{ $month($r['cycle']['start']) }} · {{ day($r['cycle']['start'], false) }} to {{ day($r['cycle']['end'], false) }}</div>
                            <h2 id="rt" class="mt-1.5 text-[clamp(30px,4vw,40px)] leading-[1.15] font-extrabold tracking-[-0.03em]">{{ $keptMore ? 'You kept more than you spent' : 'A cycle that asked a lot' }}</h2>
                            <p class="mt-2.5 text-base leading-6 text-[#3E5B57]">{{ $r['within_budget']['count'] }} of {{ $r['within_budget']['of'] }} envelopes stayed within budget.</p>
                        </div>
                        <div class="flex flex-wrap gap-2.5">
                            @if (($r['streak_weeks'] ?? 0) > 0)<span class="rounded-[14px] bg-white px-3.5 py-2 text-sm font-bold">{{ $r['streak_weeks'] }}-week streak</span>@endif
                            @if (($r['investing']['current'] ?? 0) > 1)<span class="rounded-[14px] bg-white px-3.5 py-2 text-sm font-bold">Investing {{ $r['investing']['current'] }} cycles running</span>@endif
                        </div>
                    </section>

                    <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
                        <div class="rounded-[20px] bg-white px-5 py-[18px]"><div class="text-sm font-bold text-slate">Came in</div><div class="num mt-1 text-[26px] font-extrabold">{{ money_big($r['deposits']) }}</div></div>
                        <div class="rounded-[20px] bg-white px-5 py-[18px]"><div class="text-sm font-bold text-slate">Spent</div><div class="num mt-1 text-[26px] font-extrabold">{{ money_big($r['spent_net']) }}</div>@if (! Money::isZero($r['refunded']))<div class="text-[13px] text-slate">After {{ money($r['refunded']) }} refunded</div>@endif</div>
                        <div class="rounded-[20px] {{ $keptMore ? 'bg-tint' : 'bg-red-tint' }} px-5 py-[18px]"><div class="text-sm font-bold {{ $keptMore ? 'text-teal' : 'text-red-ink' }}">Kept</div><div class="num mt-1 text-[26px] font-extrabold">{{ money_big($r['kept']) }}</div>@if (! Money::isZero($r['to_accounts']['total']))<div class="text-[13px] text-[#3E5B57]">{{ money($r['to_accounts']['total']) }} of it went to accounts</div>@endif</div>
                    </div>

                    <div class="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
                        <section aria-labelledby="env" class="card">
                            <h3 id="env" class="mb-3 text-lg font-extrabold">Envelopes</h3>
                            <div class="overflow-x-auto">
                                <table class="table min-w-[360px] [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
                                    <thead><tr><th scope="col">Envelope</th><th scope="col" class="r">Spent</th><th scope="col" class="r">At the end</th></tr></thead>
                                    <tbody>
                                        @foreach ($r['envelopes'] as $e)
                                            <tr>
                                                <td class="font-bold">{{ $e['name'] }}@if ($e['kind'] === 'saving_up') <span class="text-[12.5px] font-semibold text-slate">Saving up</span>@endif</td>
                                                <td class="r">{{ money($e['spent']) }}</td>
                                                <td class="r {{ Money::isNegative($e['balance_end']) ? 'font-extrabold text-red' : '' }}">{{ money($e['balance_end']) }}</td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div class="flex min-w-0 flex-col gap-5">
                            @if (! Money::isZero($r['to_accounts']['total']))
                                <section aria-labelledby="pa" class="rounded-3xl bg-navy p-6 text-white">
                                    <h3 id="pa" class="text-lg font-extrabold">Put away</h3>
                                    <div class="num mt-1.5 text-[30px] font-extrabold">{{ money($r['to_accounts']['total']) }}</div>
                                    <div class="mt-3.5 flex flex-col gap-2 text-[14.5px]">
                                        @foreach (['savings' => 'Savings', 'holding' => 'Holding', 'investment' => 'Investments'] as $k => $label)
                                            @continue(Money::isZero($r['to_accounts'][$k] ?? '0'))
                                            <div class="flex justify-between"><span class="font-bold text-navy-soft">{{ $label }}</span><b class="num">{{ money($r['to_accounts'][$k]) }}</b></div>
                                        @endforeach
                                    </div>
                                </section>
                            @endif

                            @if (count($r['transactions']['by_member'] ?? []) > 1)
                                <section aria-labelledby="tog" class="card">
                                    <h3 id="tog" class="text-lg font-extrabold">Who recorded what</h3>
                                    <div class="mt-3.5 flex flex-col gap-3">
                                        @foreach ($r['transactions']['by_member'] as $i => $m)
                                            <div class="flex items-center gap-3"><span class="who who-{{ $i % 4 }}" aria-hidden="true">{{ initials($m['name']) }}</span><span class="flex-1 text-[15px] font-bold">{{ $m['name'] ?? 'Someone who left' }}</span><span class="text-[14.5px] text-slate">{{ $m['count'] }} {{ $m['count'] === 1 ? 'entry' : 'entries' }}</span></div>
                                        @endforeach
                                    </div>
                                </section>
                            @endif

                            <section class="card">
                                <h3 class="text-lg font-extrabold">See you next cycle</h3>
                                <p class="mt-2 text-[15px] leading-[23px] text-slate">Small, regular check-ins beat big catch-ups.</p>
                            </section>
                        </div>
                    </div>
                </article>
            @elseif ($premiumRequired)
                <div class="card flex-[999_1_560px]"><p class="sub">Older recaps come with Premium. <a href="{{ route('premium') }}" class="link">See Premium</a></p></div>
            @endif
        </div>
    @endif
</x-layouts.app>
