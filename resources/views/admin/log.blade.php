@php
    $tones = ['premium' => 'bg-tint text-teal', 'support' => 'bg-navy-tint text-navy', 'signed' => 'bg-canvas text-slate'];
    $detail = fn ($a) => collect([
        $a['details']['budget'] ?? null,
        isset($a['details']['until']) ? 'until '.day($a['details']['until'], false) : null,
        $a['details']['kind'] ?? null,
        $a['details']['device'] ?? null,
    ])->filter()->join(' · ');
@endphp
<x-layouts.app title="Admin log" :admin="true">
    <header>@include('admin.badge')<h1 class="h1 mt-1.5">Admin log</h1><p class="sub mt-0.5">Every change made from the admin area, and every admin sign-in.</p></header>
    <section aria-label="Log" class="rounded-3xl bg-white pt-[18px] pb-1.5">
        <div class="overflow-x-auto">
            <table class="table min-w-[820px] [&_td]:h-auto [&_td]:py-3 [&_td]:align-top">
                <thead><tr><th scope="col">When</th><th scope="col">Admin</th><th scope="col">What</th><th scope="col">Who or which budget</th><th scope="col">Note</th></tr></thead>
                <tbody>
                    @forelse ($list['data'] ?? [] as $a)
                        <tr>
                            <td class="text-slate">{{ day($a['created_at']) }}, {{ \Illuminate\Support\Carbon::parse($a['created_at'])->setTimezone(session('timezone', 'Africa/Johannesburg'))->format('H:i') }}</td>
                            <td>{{ $a['admin'] ?? 'Deleted admin' }}</td>
                            <td><span class="chip {{ $tones[strtok($a['action'], '_')] ?? 'bg-canvas text-slate' }}">{{ ucfirst(str_replace('_', ' ', $a['action'])) }}</span></td>
                            <td class="whitespace-normal">@if ($a['user'])<a href="{{ route('admin.user', $a['user']['id']) }}" class="font-bold">{{ $a['user']['name'] }}</a>@endif<div class="text-[13px] font-medium text-slate">{{ $detail($a) }}</div></td>
                            <td class="whitespace-normal font-medium text-slate">{{ $a['note'] }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="text-slate">Nothing yet.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>
    @if (($list['last_page'] ?? 1) > 1)
        @php $page = $list['current_page']; @endphp
        <nav aria-label="Pages" class="flex justify-end gap-2">
            @if ($page > 1)<a href="{{ route('admin.log', ['page' => $page - 1]) }}" class="pill">Newer</a>@endif
            @if ($page < $list['last_page'])<a href="{{ route('admin.log', ['page' => $page + 1]) }}" class="pill">Older</a>@endif
        </nav>
    @endif
</x-layouts.app>
