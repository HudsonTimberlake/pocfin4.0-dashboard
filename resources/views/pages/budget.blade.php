@php
    use App\Support\Money;
    $count = count($everyday) + count($savingUp);
@endphp
<x-layouts.app title="Budget">
    <header>
        <h1 class="h1">Budget</h1>
        <p class="sub mt-0.5">{{ $count }} {{ $count === 1 ? 'envelope' : 'envelopes' }} · {{ money($summary['left_to_spend'] ?? '0') }} left to spend · cycle {{ day($summary['cycle']['start'] ?? null, false) }} to {{ day($summary['cycle']['end'] ?? null, false) }}</p>
    </header>

    <div class="flex flex-wrap items-start gap-5">
        <section aria-label="Envelopes" class="min-w-0 flex-[999_1_600px] rounded-3xl bg-white pt-5 pb-2">
            {{-- Wide screens: one table. Phones: rows, tapping one opens its details below the list. --}}
            <div class="hidden overflow-x-auto min-[700px]:block">
                <table class="table min-w-[680px]">
                    <thead><tr><th scope="col">Envelope</th><th scope="col" class="r">Target</th><th scope="col" class="r">Allocated</th><th scope="col" class="r">Spent</th><th scope="col" class="r w-40">Balance</th></tr></thead>
                    <tbody>
                        @foreach (['Everyday' => $everyday, 'Saving up' => $savingUp] as $group => $rows)
                            @continue(count($rows) === 0)
                            <tr><td colspan="5" class="h-12 border-t-0 align-bottom text-[14.5px] font-extrabold">{{ $group }}</td></tr>
                            @foreach ($rows as $e)
                                @php
                                    $over = Money::isNegative($e['balance']);
                                    $on = $selected && $selected['id'] === $e['id'];
                                @endphp
                                <tr class="{{ $on ? 'bg-tint-soft' : '' }}">
                                    <td><a href="{{ route('budget', ['envelope' => $e['id']]) }}" class="inline-flex items-center gap-3 font-bold" @if ($on) aria-current="true" @endif><span class="grid size-[34px] place-items-center rounded-full {{ $over ? 'bg-red-tint text-red' : 'bg-tint text-teal' }}"><x-icon name="envelope" :size="18"/></span>{{ $e['name'] }}</a></td>
                                    <td class="r text-slate">{{ money($e['budgeted_amount']) }}</td>
                                    <td class="r">{{ money($e['allocated_this_cycle'] ?? '0') }}</td>
                                    <td class="r">{{ money($e['spent_this_cycle'] ?? '0') }}</td>
                                    <td class="r">
                                        <div class="font-extrabold {{ $over ? 'text-red' : '' }}">{{ money($e['balance']) }}</div>
                                        @if ($group === 'Everyday')<div class="bar ml-auto mt-1.5 h-[5px] w-[120px] {{ $over ? 'over' : '' }}"><i style="width: {{ $over ? 100 : Money::percent($e['balance'], $e['budgeted_amount']) }}%"></i></div>@endif
                                    </td>
                                </tr>
                            @endforeach
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="min-[700px]:hidden">
                @foreach (['Everyday' => $everyday, 'Saving up' => $savingUp] as $group => $rows)
                    @continue(count($rows) === 0)
                    <h2 class="px-4 pt-1 pb-1.5 text-[15px] font-extrabold">{{ $group }}</h2>
                    @foreach ($rows as $e)
                        @php $over = Money::isNegative($e['balance']); @endphp
                        <a href="{{ route('budget', ['envelope' => $e['id']]) }}#details" class="flex items-center gap-3 border-t border-rule px-4 py-3">
                            <span class="grid size-[34px] flex-none place-items-center rounded-full {{ $over ? 'bg-red-tint text-red' : 'bg-tint text-teal' }}"><x-icon name="envelope" :size="18"/></span>
                            <span class="min-w-0 flex-1">
                                <span class="flex justify-between gap-2"><span class="truncate text-[15px] font-bold">{{ $e['name'] }}</span><span class="num text-[15px] font-extrabold {{ $over ? 'text-red' : '' }}">{{ money($e['balance']) }}</span></span>
                                <span class="num mt-1 block text-[12.5px] text-slate">Spent {{ money($e['spent_this_cycle'] ?? '0') }} of {{ money($e['budgeted_amount']) }}</span>
                            </span>
                        </a>
                    @endforeach
                @endforeach
            </div>
            @if ($count === 0)<p class="sub px-6 pb-4">No envelopes yet. Make them in the PocFin app.</p>@endif
        </section>

        @if ($selected)
            <aside id="details" aria-labelledby="sel" class="card min-w-0 flex-[1_1_320px]">
                <div class="flex items-center gap-3">
                    <span class="grid size-11 flex-none place-items-center rounded-full bg-tint text-teal"><x-icon name="envelope" :size="22"/></span>
                    <div><h2 id="sel" class="text-xl font-extrabold">{{ $selected['name'] }}</h2><p class="text-[13.5px] text-slate">{{ $selected['kind'] === 'saving_up' ? 'Saving up' : 'Everyday' }} · target {{ money($selected['budgeted_amount']) }}</p></div>
                </div>
                <div class="num mt-[18px] text-[40px] font-extrabold tracking-[-0.03em] {{ Money::isNegative($selected['balance']) ? 'text-red' : '' }}">{{ money_big($selected['balance']) }}</div>
                <p class="text-sm text-slate">in it now</p>
                <div class="mt-4 grid grid-cols-2 gap-2.5">
                    <div class="rounded-[14px] bg-canvas px-3.5 py-3"><div class="text-[13px] font-bold text-slate">Allocated</div><div class="num text-base font-extrabold">{{ money($selected['allocated_this_cycle'] ?? '0') }}</div></div>
                    <div class="rounded-[14px] bg-canvas px-3.5 py-3"><div class="text-[13px] font-bold text-slate">Spent</div><div class="num text-base font-extrabold">{{ money($selected['spent_this_cycle'] ?? '0') }}</div></div>
                    @if (! Money::isZero($selected['refunded_this_cycle'] ?? '0'))
                        <div class="rounded-[14px] bg-canvas px-3.5 py-3"><div class="text-[13px] font-bold text-slate">Refunded</div><div class="num text-base font-extrabold text-teal">{{ money($selected['refunded_this_cycle']) }}</div></div>
                    @endif
                </div>
                <h3 class="mt-[22px] mb-1 text-[15px] font-extrabold">Recent</h3>
                @forelse ($activity as $a)
                    <div class="flex items-center gap-2.5 border-t border-rule py-2.5">
                        <div class="min-w-0 flex-1"><div class="truncate text-[14.5px] font-bold">{{ $a['note'] ?: $a['kind'] }}</div><div class="text-[12.5px] text-slate">{{ $a['kind'] }} · {{ day($a['date']) }}{{ $a['by'] ? ' · '.\Illuminate\Support\Str::before($a['by']['name'], ' ') : '' }}</div></div>
                        <div class="num text-[14.5px] font-extrabold {{ $a['in'] ? 'text-teal' : '' }}">{{ $a['in'] ? '+' : '' }}{{ money($a['amount']) }}</div>
                    </div>
                @empty
                    <p class="sub">Nothing yet.</p>
                @endforelse
            </aside>
        @endif
    </div>
</x-layouts.app>
