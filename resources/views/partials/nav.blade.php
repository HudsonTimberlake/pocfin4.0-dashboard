@php
    $budget = $shell->budget();
    $link = fn ($route, $label, $icon, $match = null) => ['route' => $route, 'label' => $label, 'icon' => $icon, 'on' => request()->routeIs($match ?? $route)];
    $money = [
        $link('overview', 'Overview', 'home'),
        $link('budget', 'Budget', 'envelope'),
        $link('history', 'History', 'list'),
        $link('accounts', 'Accounts', 'bank'),
        $link('recaps', 'Recaps', 'sparkle'),
    ];
    $account = [
        $link('account', 'Profile and security', 'user', 'account*'),
        $link('premium', 'Premium', 'star'),
        $link('invite', 'Invite friends', 'gift'),
    ];
    $admin = [
        $link('admin.users', 'Users', 'users', 'admin.user*'),
        $link('admin.support', 'Support', 'chat', 'admin.support*'),
        $link('admin.log', 'Admin log', 'clipboard'),
    ];
@endphp
<nav aria-label="Main" class="flex flex-col gap-[18px] px-3.5 py-6">
    <a href="{{ route('overview') }}" class="flex items-center gap-2.5 px-2"><x-logo/><span class="text-xl font-extrabold tracking-[-0.02em]">PocFin</span></a>

    @if ($budget)
        <div x-data="toggle" class="relative" @keydown.escape="shut">
            <button type="button" @click="flip" :aria-expanded="open" aria-haspopup="true" class="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left">
                <span class="grid size-9 flex-none place-items-center rounded-xl bg-tint text-[15px] font-extrabold text-teal">{{ \App\Services\Shell::initials($budget['name']) }}</span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-[15px] font-bold">{{ $budget['name'] }}</span>
                    <span class="block text-[12.5px] text-slate">{{ $budget['role'] === 'owner' ? 'Yours' : 'Shared with you' }}{{ ($budget['premium']['active'] ?? false) ? ' · Premium' : '' }}</span>
                </span>
                <x-icon name="updown" :size="16" class="text-slate"/>
            </button>
            <div x-cloak x-show="open" @click.outside="shut" class="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl bg-white p-2 shadow-[0_0_0_1px_#E7EAEA]">
                @foreach ($shell->budgets() as $b)
                    <form method="POST" action="{{ route('budget.switch') }}">
                        @csrf
                        <input type="hidden" name="budget_id" value="{{ $b['id'] }}">
                        <button class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-canvas" @if ($b['id'] === $budget['id']) aria-current="true" @endif>
                            <span class="grid size-8 flex-none place-items-center rounded-[10px] bg-tint text-[13px] font-extrabold text-teal">{{ \App\Services\Shell::initials($b['name']) }}</span>
                            <span class="min-w-0 flex-1 truncate text-[14.5px] font-bold">{{ $b['name'] }}</span>
                            @if ($b['paused'] ?? false)<span class="chip bg-red-tint text-red-ink">Paused</span>@endif
                            @if ($b['id'] === $budget['id'])<x-icon name="check" :size="16" class="text-teal"/>@endif
                        </button>
                    </form>
                @endforeach
            </div>
        </div>
    @endif

    <div class="flex flex-col gap-0.5">
        @foreach ($money as $item)
            <a href="{{ route($item['route']) }}" class="nav-link" @if ($item['on']) aria-current="page" @endif><x-icon :name="$item['icon']"/>{{ $item['label'] }}</a>
        @endforeach
    </div>

    <div class="flex flex-col gap-0.5">
        <div class="px-3 pb-1.5 text-[13px] font-bold text-slate">Your account</div>
        @foreach ($account as $item)
            <a href="{{ route($item['route']) }}" class="nav-link" @if ($item['on']) aria-current="page" @endif><x-icon :name="$item['icon']"/>{{ $item['label'] }}</a>
        @endforeach
    </div>

    @if ($shell->isAdmin())
        <div class="flex flex-col gap-0.5">
            <div class="px-3 pb-1.5 text-[13px] font-bold text-slate">Admin</div>
            @foreach ($admin as $item)
                <a href="{{ route($item['route']) }}" class="nav-link" @if ($item['on']) aria-current="page" @endif><x-icon :name="$item['icon']"/>{{ $item['label'] }}</a>
            @endforeach
        </div>
    @endif

    <div class="mt-2 flex flex-col gap-0.5 border-t border-line pt-3.5">
        <div class="flex items-center gap-2.5 px-3 pt-1 pb-2.5">
            <span class="grid size-8 flex-none place-items-center rounded-full bg-navy-tint text-[13px] font-extrabold text-navy">{{ initials($shell->user()['name'] ?? '') }}</span>
            <span class="min-w-0"><span class="block text-sm font-bold">{{ $shell->user()['name'] ?? '' }}</span><span class="block truncate text-[12.5px] text-slate">{{ $shell->user()['email'] ?? '' }}</span></span>
        </div>
        <form method="POST" action="{{ route('lock-now') }}">@csrf<button class="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold text-teal"><x-icon name="lock"/>Lock now</button></form>
        <form method="POST" action="{{ route('sign-out') }}">@csrf<button class="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] font-bold text-teal"><x-icon name="signout"/>Sign out</button></form>
    </div>
</nav>
