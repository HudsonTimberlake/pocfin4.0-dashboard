@php
    use App\Support\Money;
    $types = ['savings' => 'Savings', 'holding' => 'Holding', 'investment' => 'Investment'];
    $pct = fn ($v) => $v === null ? '—' : $v.'%';
    $tone = fn ($v) => $v !== null && str_starts_with((string) $v, '-') ? 'text-red' : 'text-teal';
    $purposeTotal = max(1, collect($purposes)->sum(fn ($p) => max(0, Money::cents($p['value']))));
    $shades = ['#013551', '#03C7AA', '#9BB8CA', '#027868', '#5F8CA6', '#7FE3D2'];
@endphp
<x-layouts.app title="Accounts">
    <header>
        <h1 class="h1">Accounts</h1>
        <p class="sub mt-0.5">{{ money($summary['accounts']['total'] ?? '0') }} across {{ count($accounts) }} {{ count($accounts) === 1 ? 'account' : 'accounts' }}</p>
    </header>

    @if (! $accounts)
        <div class="card"><p class="sub">No accounts yet. Savings, holding and investment accounts are made in the app.</p></div>
    @else
        <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            @foreach ($accounts as $a)
                @php $on = $selected && $selected['id'] === $a['id']; @endphp
                <a href="{{ route('accounts', ['account' => $a['id']]) }}" @if ($on) aria-current="true" @endif class="flex flex-col gap-0.5 rounded-[20px] px-5 py-[18px] {{ $on ? 'bg-navy text-white' : 'bg-white' }}">
                    <span class="flex items-center gap-1.5 text-[13.5px] font-bold {{ $on ? 'text-navy-soft' : 'text-slate' }}">{{ $types[$a['type']] ?? $a['type'] }} · {{ $a['visibility'] === 'private' ? 'private' : 'shared' }}@if ($a['visibility'] === 'private')<x-icon name="lock" :size="14" :stroke="2.2"/>@endif</span>
                    <span class="text-base font-extrabold">{{ $a['name'] }}</span>
                    <span class="num mt-1.5 text-2xl font-extrabold tracking-[-0.02em]">{{ money($a['value'] ?? $a['balance']) }}</span>
                    @if ($a['gain'] !== null)<span class="num text-[13.5px] font-bold {{ $on ? 'text-mint-light' : $tone($a['gain']) }}">{{ money($a['gain'], true) }} on {{ money($a['balance']) }} put in</span>@endif
                </a>
            @endforeach
        </div>

        @if ($selected && $selected['type'] === 'investment')
            <section aria-labelledby="inv" class="rounded-3xl bg-white pt-6 pb-2">
                <div class="flex flex-wrap items-end justify-between gap-3 px-6">
                    <div><h2 id="inv" class="text-xl font-extrabold">{{ $selected['name'] }}</h2><p class="mt-0.5 text-sm text-slate">{{ count($holdings) }} {{ count($holdings) === 1 ? 'holding' : 'holdings' }}</p></div>
                    <nav aria-label="Period for time-weighted return" class="flex gap-1 rounded-full bg-canvas p-1">
                        @foreach (['cycle' => 'This cycle', 'ytd' => 'Year to date', 'all' => 'Since start'] as $key => $label)
                            <a href="{{ route('accounts', ['account' => $selected['id'], 'period' => $key]) }}" class="flex h-8 items-center rounded-full px-3.5 text-[13.5px] font-bold {{ $period === $key ? 'bg-white' : '' }}" @if ($period === $key) aria-current="true" @endif>{{ $label }}</a>
                        @endforeach
                    </nav>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="table min-w-[760px]">
                        <thead><tr><th scope="col">Holding</th><th scope="col" class="r">Value</th><th scope="col" class="r">Put in</th><th scope="col" class="r">Gain</th><th scope="col" class="r">Simple return</th><th scope="col" class="r">Time-weighted</th></tr></thead>
                        <tbody>
                            @forelse ($holdings as $h)
                                @php $r = $returns['h'.$h['id']] ?? null; @endphp
                                <tr>
                                    <td><span class="font-extrabold">{{ $h['name'] }}</span><div class="text-[12.5px] font-semibold text-slate">{{ collect($h['positions'] ?? [])->pluck('purpose')->join(', ') }}@if ($h['last_valuation']) · valued {{ day($h['last_valuation']['date'], false) }}@endif</div></td>
                                    <td class="r font-extrabold">{{ money($h['value']) }}</td>
                                    <td class="r">{{ money($r['net_contributed'] ?? null) }}</td>
                                    <td class="r {{ $tone($r['gain'] ?? null) }}">{{ $r ? money($r['gain'], true) : '—' }}</td>
                                    <td class="r {{ $tone($r['simple_return'] ?? null) }}">{{ $pct($r['simple_return'] ?? null) }}</td>
                                    <td class="r font-extrabold {{ $tone($r['time_weighted_return'] ?? null) }}">{{ $pct($r['time_weighted_return'] ?? null) }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="6" class="text-slate">No holdings yet.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
                <p class="px-6 pt-3 pb-3.5 text-[13px] leading-[19px] text-slate">Simple return is gain over what you put in. Time-weighted return follows the price only, so the timing of your money in and out doesn’t change it.</p>
            </section>
        @endif

        <div class="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
            @if ($selected && $selected['type'] === 'investment' && $purposes)
                <section aria-labelledby="pp" class="card">
                    <h2 id="pp" class="h2">Purposes</h2>
                    <p class="mt-0.5 text-sm text-slate">Each one across every holding</p>
                    <div class="mt-[18px] flex h-3.5 gap-[3px] overflow-hidden rounded-[7px]" aria-hidden="true">
                        @foreach ($purposes as $i => $p)<span style="width: {{ intdiv(max(0, Money::cents($p['value'])) * 100, $purposeTotal) }}%; background: {{ $shades[$i % 6] }}"></span>@endforeach
                    </div>
                    <div class="mt-3.5">
                        @foreach ($purposes as $i => $p)
                            <div class="flex items-center gap-3 py-3 {{ $i ? 'border-t border-rule' : '' }}">
                                <span class="size-3 rounded" style="background: {{ $shades[$i % 6] }}"></span>
                                <span class="flex-1 text-[15px] font-bold">{{ $p['name'] }}</span>
                                <span class="num text-[15px] font-extrabold">{{ money($p['value']) }}</span>
                                <span class="num w-[100px] text-right text-[13.5px] font-bold {{ $tone($p['gain']) }}">{{ money($p['gain'], true) }}</span>
                            </div>
                        @endforeach
                    </div>
                </section>
            @endif

            @if ($selected)
                <section aria-labelledby="mv" class="card">
                    <h2 id="mv" class="h2">Money in and out · {{ $selected['name'] }}</h2>
                    <div class="mt-2">
                        @forelse ($moves as $m)
                            <div class="flex items-center gap-3 border-t border-rule py-3 first:border-t-0">
                                <div class="min-w-0 flex-1"><div class="truncate text-[15px] font-bold">{{ $m['what'] }}</div><div class="text-[13px] text-slate">{{ day($m['date']) }}{{ $m['by'] ? ' · '.\Illuminate\Support\Str::before($m['by']['name'], ' ') : '' }}</div></div>
                                <span class="num text-[15px] font-extrabold {{ $m['in'] ? 'text-teal' : '' }}">{{ $m['in'] ? '+' : '−' }}{{ money($m['amount']) }}</span>
                            </div>
                        @empty
                            <p class="sub">Nothing yet.</p>
                        @endforelse
                    </div>
                </section>
            @endif
        </div>
    @endif
</x-layouts.app>
