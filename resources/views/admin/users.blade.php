@php
    $plans = ['subscriber' => ['Subscriber', 'bg-mint text-ink'], 'premium' => ['Premium budget', 'bg-tint text-teal'], 'free' => ['Free', 'bg-canvas text-slate']];
    $counts = $list['counts'] ?? [];
@endphp
<x-layouts.app title="Users" :admin="true">
    <header>
        @include('admin.badge')
        <h1 class="h1 mt-1.5">Users</h1>
        <p class="sub mt-0.5">{{ number_format($counts['all'] ?? 0) }} people · {{ number_format($counts['subscribers'] ?? 0) }} subscribers · {{ number_format($counts['unverified'] ?? 0) }} not verified</p>
    </header>

    <form method="POST" action="{{ route('admin.users') }}" role="search" class="flex flex-wrap items-center gap-2.5">
        @csrf
        <label class="flex h-[46px] min-w-[260px] flex-[1_1_320px] items-center gap-2.5 rounded-[14px] bg-white px-4 shadow-[inset_0_0_0_1.5px_#E7EAEA] focus-within:shadow-[inset_0_0_0_1.5px_#1E1E1E]">
            <x-icon name="search" class="text-slate"/><span class="sr-only">Search by name or email</span>
            <input name="q" value="{{ $filters['q'] ?? '' }}" placeholder="Search by name or email" class="min-w-0 flex-1 bg-transparent text-[15.5px] font-semibold outline-none">
        </label>
        <div role="group" aria-label="Show" class="flex flex-wrap gap-1.5">
            @foreach (['' => 'Everyone', 'premium' => 'Premium', 'subscribers' => 'Subscribers', 'unverified' => 'Not verified'] as $key => $label)
                <button name="filter" value="{{ $key }}" aria-pressed="{{ ($filters['filter'] ?? '') === $key ? 'true' : 'false' }}" class="pill {{ ($filters['filter'] ?? '') === $key ? 'pill-on' : '' }}">{{ $label }}</button>
            @endforeach
        </div>
    </form>

    <section aria-label="Users" class="rounded-3xl bg-white pt-[18px] pb-1.5">
        <div class="overflow-x-auto">
            <table class="table min-w-[860px]">
                <thead><tr><th scope="col">Person</th><th scope="col">Joined</th><th scope="col">Plan</th><th scope="col">App</th><th scope="col">Last seen</th><th scope="col"><span class="sr-only">Open</span></th></tr></thead>
                <tbody>
                    @forelse ($list['data'] ?? [] as $u)
                        <tr>
                            <td><a href="{{ route('admin.user', $u['id']) }}" class="inline-flex items-center gap-3"><span class="grid size-[34px] place-items-center rounded-full bg-canvas text-[13px] font-extrabold text-slate" aria-hidden="true">{{ initials($u['name']) }}</span><span><span class="block font-bold">{{ $u['name'] }}</span><span class="block text-[13px] font-medium text-slate">{{ $u['email'] }}</span></span></a></td>
                            <td class="text-slate">{{ day($u['joined_at'], false) }}</td>
                            <td>
                                @if (! $u['verified'])<span class="chip bg-amber-tint text-amber-ink">Not verified</span>
                                @else <span class="chip {{ $plans[$u['plan']][1] }}">{{ $plans[$u['plan']][0] }}</span>@endif
                            </td>
                            <td class="text-slate">{{ $u['app_platform'] ? ($u['app_platform'] === 'ios' ? 'iOS' : 'Android').' '.$u['app_version'] : '—' }}</td>
                            <td class="text-slate">{{ $u['last_seen_at'] ? day($u['last_seen_at']) : '—' }}</td>
                            <td class="r"><a href="{{ route('admin.user', $u['id']) }}" aria-label="Open {{ $u['name'] }}" class="inline-grid size-9 place-items-center text-slate"><x-icon name="chev" :size="16" :stroke="2.4"/></a></td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="text-slate">Nobody matches.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>

    @if (($list['last_page'] ?? 1) > 1)
        @php $page = $list['current_page']; @endphp
        <nav aria-label="Pages" class="flex flex-wrap items-center justify-between gap-3">
            <span class="text-[14.5px] text-slate">Newest first · {{ $list['from'] }} to {{ $list['to'] }} of {{ number_format($list['total']) }}</span>
            <div class="flex gap-2">
                @if ($page > 1)<a href="{{ route('admin.users', ['page' => $page - 1]) }}" class="pill">Newer</a>@endif
                @if ($page < $list['last_page'])<a href="{{ route('admin.users', ['page' => $page + 1]) }}" class="pill">Older</a>@endif
            </div>
        </nav>
    @endif
</x-layouts.app>
