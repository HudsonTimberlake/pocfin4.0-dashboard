@php
    use App\Support\Money;
    $rows = $list['data'] ?? [];
    $tabs = ['spent' => 'Spent', 'income' => 'Income', 'moved' => 'Moved'];
    $place = function ($envelopeId, $accountId, $private) use ($envelopes, $accounts) {
        return match (true) {
            $private => 'Private account',
            $envelopeId !== null => $envelopes[$envelopeId]['name'] ?? 'Envelope',
            $accountId !== null => $accounts[$accountId]['name'] ?? 'Account',
            default => '',
        };
    };
@endphp
<x-layouts.app title="History">
    <header>
        <h1 class="h1">History</h1>
        <p class="sub mt-0.5">Everything recorded in {{ $shell->budget()['name'] ?? 'this budget' }}, newest first</p>
    </header>

    <nav aria-label="Kind" class="flex gap-1.5">
        @foreach ($tabs as $key => $label)
            <a href="{{ route('history', ['tab' => $key]) }}" class="pill {{ $tab === $key ? 'pill-on' : '' }}" @if ($tab === $key) aria-current="page" @endif>{{ $label }}</a>
        @endforeach
    </nav>

    <form method="POST" action="{{ route('history') }}" role="search" class="flex flex-wrap items-end gap-2.5">
        @csrf
        <input type="hidden" name="tab" value="{{ $tab }}">
        <label class="flex h-[46px] min-w-[260px] flex-[1_1_280px] items-center gap-2.5 rounded-[14px] bg-white px-4 shadow-[inset_0_0_0_1.5px_#E7EAEA] focus-within:shadow-[inset_0_0_0_1.5px_#1E1E1E]">
            <x-icon name="search" class="text-slate"/>
            <span class="sr-only">Search notes, amounts or names</span>
            <input name="q" value="{{ $filters['q'] ?? '' }}" placeholder="Search notes, amounts or names" class="min-w-0 flex-1 bg-transparent text-[15.5px] font-semibold outline-none">
        </label>
        <label class="flex flex-col"><span class="label">From</span><input type="date" name="from" value="{{ $filters['from'] ?? '' }}" class="field h-[46px] w-auto"></label>
        <label class="flex flex-col"><span class="label">To</span><input type="date" name="to" value="{{ $filters['to'] ?? '' }}" class="field h-[46px] w-auto"></label>
        @if ($tab !== 'income')
            <label class="flex flex-col"><span class="label">Envelope</span>
                <select name="envelope_id" class="field h-[46px] w-auto pr-8">
                    <option value="">All envelopes</option>
                    @foreach ($envelopes as $e)<option value="{{ $e['id'] }}" @selected(($filters['envelope_id'] ?? null) == $e['id'])>{{ $e['name'] }}</option>@endforeach
                </select>
            </label>
        @endif
        <button class="btn h-[46px]">Search</button>
        @if ($filters)<button name="clear" value="1" class="btn-quiet h-[46px]">Clear</button>@endif
    </form>
    @error('to')<p class="field-error">{{ $message }}</p>@enderror

    <p class="text-[14.5px] text-slate">{{ number_format($list['total'] ?? count($rows)) }} found</p>

    <section aria-label="Results" class="rounded-3xl bg-white pt-[18px] pb-1.5">
        <div class="overflow-x-auto">
            <table class="table min-w-[720px]">
                <thead><tr>
                    <th scope="col">Date</th><th scope="col">Note</th>
                    <th scope="col">{{ $tab === 'moved' ? 'From → to' : ($tab === 'spent' ? 'Envelope' : 'Allocated') }}</th>
                    @if (count($members) > 1)<th scope="col">Recorded by</th>@endif
                    @if ($tab === 'spent')<th scope="col"><span class="sr-only">Receipt</span></th>@endif
                    <th scope="col" class="r">Amount</th>
                </tr></thead>
                <tbody>
                    @forelse ($rows as $r)
                        @php $by = $members[$r['created_by']] ?? null; @endphp
                        <tr>
                            <td class="text-slate">{{ day($r['date']) }}</td>
                            <td class="max-w-[280px] truncate font-bold">{{ $r['note'] ?: '—' }}</td>
                            <td>
                                @if ($tab === 'spent')
                                    <span class="inline-flex h-7 items-center rounded-full bg-canvas px-3 text-[13.5px] font-bold">{{ $envelopes[$r['envelope_id']]['name'] ?? 'Envelope' }}</span>@if ($r['refund'])<span class="chip ml-1.5 bg-tint text-teal">Refund</span>@endif
                                @elseif ($tab === 'moved')
                                    {{ $place($r['from_envelope_id'], $r['from_account_id'], $r['from_private_account']) }} → {{ $place($r['to_envelope_id'], $r['to_account_id'], $r['to_private_account']) }}
                                @else
                                    {{ money($r['allocated']) }} @if (! Money::isZero($r['unallocated']))<span class="text-slate">· {{ money($r['unallocated']) }} left</span>@endif
                                @endif
                            </td>
                            @if (count($members) > 1)<td>{{ $by['name'] ?? '' }}</td>@endif
                            @if ($tab === 'spent')
                                <td>@if ($r['has_receipt'])<a href="{{ route('history.receipt', $r['id']) }}" target="_blank" rel="noopener" aria-label="Open receipt photo" class="grid size-9 place-items-center rounded-full bg-tint text-teal"><x-icon name="receipt" :size="18"/></a>@endif</td>
                            @endif
                            <td class="r font-extrabold {{ ($tab === 'spent' && $r['refund']) || $tab === 'income' ? 'text-teal' : '' }}">{{ ($tab === 'spent' && $r['refund']) || $tab === 'income' ? '+' : '' }}{{ money($r['amount']) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-slate">{{ $filters ? 'Nothing matches. Try other words or dates.' : 'Nothing recorded yet.' }}</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>

    @if (($list['last_page'] ?? 1) > 1)
        @php $page = $list['current_page'] ?? 1; @endphp
        <nav aria-label="Pages" class="flex flex-wrap items-center justify-between gap-3">
            <span class="text-[14.5px] text-slate">{{ $list['from'] }} to {{ $list['to'] }} of {{ number_format($list['total']) }}</span>
            <div class="flex gap-2">
                @if ($page > 1)<a href="{{ route('history', ['tab' => $tab, 'page' => $page - 1]) }}" class="pill">Newer</a>@endif
                @if ($page < $list['last_page'])<a href="{{ route('history', ['tab' => $tab, 'page' => $page + 1]) }}" class="pill">Older</a>@endif
            </div>
        </nav>
    @endif
</x-layouts.app>
