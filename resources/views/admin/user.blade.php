@php
    $user = $u['user'];
    $sub = $u['subscription'];
    $budgets = $u['budgets'];
    $status = fn ($p) => match (true) {
        $p['forever'] => 'Premium for good',
        $p['active'] => 'Premium until '.day($p['until'], false),
        $p['until'] !== null => 'Free since '.day($p['until'], false),
        default => 'Free',
    };
    $grantText = fn ($g) => match ($g['action']) {
        'months' => $g['months'].' '.($g['months'] === 1 ? 'month' : 'months'),
        'until' => 'Until '.day($g['until'], false),
        'forever' => 'For good',
        'end' => 'Ended',
        default => $g['action'],
    }.($g['source'] === 'referral' ? ' · referral' : '').($g['note'] ?? null ? ' · '.$g['note'] : '');
    $devices = $u['devices'] ?? [];
    $locked = $user['locked'] ?? null;
    $fact = fn ($label, $value) => ['label' => $label, 'value' => $value];
    $facts = [
        $fact('Joined', day($user['joined_at'], false)),
        $fact('Email', $user['verified'] ? 'Verified' : 'Not verified'),
        $fact('App', $user['app_platform'] ? ($user['app_platform'] === 'ios' ? 'iOS' : 'Android').' '.$user['app_version'] : '—'),
        $fact('Last seen', $user['last_seen_at'] ? day($user['last_seen_at']) : '—'),
        $fact('Referral code', $user['referral_code'] ?? '—'),
        $fact('Invited by', $user['invited_by']['name'] ?? '—'),
        $fact('Friends invited', $user['friends_invited']),
        $fact('Signed in on', $user['sessions'].' '.($user['sessions'] === 1 ? 'device' : 'devices')),
    ];
@endphp
<x-layouts.app :title="$user['name']" :admin="true">
    <header>
        <a href="{{ route('admin.users') }}" class="link inline-flex h-8 items-center gap-0.5 text-[15px]"><x-icon name="back" :size="18" :stroke="2.4"/>Users</a>
        <div class="mt-2 flex flex-wrap items-center gap-3.5">
            <span class="grid size-[52px] place-items-center rounded-full bg-tint text-xl font-extrabold text-teal" aria-hidden="true">{{ initials($user['name']) }}</span>
            <div class="min-w-[240px] flex-1"><h1 class="text-[30px] leading-9 font-extrabold tracking-[-0.025em]">{{ $user['name'] }}</h1><p class="sub">{{ $user['email'] }}</p></div>
            @if ($locked)<span class="chip bg-red-tint text-red-ink">Locked</span>@endif
            @include('admin.badge')
        </div>
    </header>

    <p class="flex items-start gap-2.5 rounded-[14px] bg-navy-tint px-4 py-3 text-sm leading-5 text-navy-ink"><x-icon name="shield" class="mt-px text-navy"/>Account and Premium only. Envelopes, amounts, transactions, notes and receipts are never shown here. Everything you change is logged.</p>
    <x-status/>

    <div class="flex flex-wrap items-start gap-5">
        <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
            <section aria-labelledby="ab" class="card">
                <h2 id="ab" class="text-lg font-extrabold">Account</h2>
                <dl class="mt-3.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))]">
                    @foreach ($facts as $f)<div class="rounded-[14px] bg-canvas px-3.5 py-3"><dt class="text-[12.5px] font-bold text-slate">{{ $f['label'] }}</dt><dd class="mt-0.5 text-[15px] font-bold">{{ $f['value'] }}</dd></div>@endforeach
                </dl>
                @unless ($user['verified'])
                    <form method="POST" action="{{ route('admin.user.verification', $user['id']) }}" class="mt-4 flex flex-wrap items-end gap-2.5">
                        @csrf
                        <div><label for="vp" class="label">Your password</label><input id="vp" name="password" type="password" autocomplete="current-password" required class="field h-11 w-56"></div>
                        <button class="btn-quiet">Send a new verification code</button>
                    </form>
                @endunless
            </section>

            <section aria-labelledby="dv" class="card">
                <div class="flex flex-wrap items-baseline justify-between gap-2.5">
                    <h2 id="dv" class="text-lg font-extrabold">Devices and access</h2>
                    @if ($locked)<span class="chip bg-red-tint text-red-ink">Locked</span>@endif
                </div>
                <p class="mt-0.5 text-[13.5px] text-slate">Where they’re signed in. After a breach: sign out the device you don’t trust, or lock the account and ask them to reset their password.</p>
                @if ($locked)
                    <p class="mt-3 flex items-start gap-2.5 rounded-[14px] bg-red-tint px-4 py-3 text-sm leading-5 text-red-ink"><x-icon name="lock" class="mt-px"/>Locked {{ day($locked['at']) }}{{ $locked['by'] ? ' by '.$locked['by'] : '' }}. No sign-in works, on the phone or here, until you unlock it. Their money is untouched.</p>
                @endif
                @if ($user['is_admin'] ?? false)
                    <p class="mt-3 text-sm text-slate">An admin’s own devices are managed from their Profile and security page.</p>
                @endif
                <form method="POST" action="{{ route('admin.user.access', $user['id']) }}" class="mt-3.5 flex flex-col gap-3.5">
                    @csrf
                    <div class="flex flex-col">
                        @forelse ($devices as $d)
                            <div class="flex items-center gap-3 border-t border-rule py-3 first:border-t-0">
                                <span class="grid size-10 flex-none place-items-center rounded-full bg-canvas text-slate"><x-icon :name="$d['client'] === 'web' ? 'laptop' : 'phone'" :size="18"/></span>
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate text-[15px] font-bold">{{ $d['name'] }}</span>
                                    <span class="block text-[13px] text-slate">{{ $d['client'] === 'web' ? 'Dashboard' : 'App' }} · signed in {{ day($d['created_at'], false) }}{{ $d['last_used_at'] ? ' · last used '.day($d['last_used_at']) : ' · not used yet' }}</span>
                                </span>
                                @unless ($user['is_admin'] ?? false)
                                    <button name="do" value="device:{{ $d['id'] }}" class="btn-quiet h-10 flex-none px-3.5 text-[14px]">Sign out</button>
                                @endunless
                            </div>
                        @empty
                            <p class="sub">{{ $locked ? 'Signed out everywhere.' : 'Not signed in anywhere.' }}</p>
                        @endforelse
                    </div>
                    @unless ($user['is_admin'] ?? false)
                        <div class="grid gap-2.5 sm:grid-cols-2">
                            <div><label for="an" class="label">Note for the log</label><input id="an" name="note" maxlength="120" placeholder="Reported a lost phone" class="field h-11"></div>
                            <div><label for="ap" class="label">Your password</label><input id="ap" name="password" type="password" autocomplete="current-password" required class="field h-11">@error('password')<p class="field-error">{{ $message }}</p>@enderror</div>
                        </div>
                        @error('user')<p class="field-error">{{ $message }}</p>@enderror
                        <div class="flex flex-wrap gap-2.5">
                            @if (count($devices) > 1)<button name="do" value="all" class="btn-quiet">Sign out everywhere</button>@endif
                            @if ($locked)
                                <button name="do" value="unlock" class="btn-quiet">Unlock the account</button>
                            @else
                                <button name="do" value="lock" class="btn-quiet text-red-ink">Lock the account</button>
                            @endif
                        </div>
                        <p class="ml-1 text-[13px] text-slate">Signing out ends those sign-ins at once; they can sign in again. Locking also refuses every new sign-in until you unlock it. Everything here is logged.</p>
                    @endunless
                </form>
            </section>

            <section aria-labelledby="su" class="card">
                <div class="flex flex-wrap items-baseline justify-between gap-2.5"><h2 id="su" class="text-lg font-extrabold">Subscription</h2></div>
                @if ($sub['active'])
                    <p class="mt-2.5 text-[15px]">{{ $sub['product'] }} · {{ $sub['store'] === 'play_store' ? 'Google Play' : 'App Store' }} · {{ $sub['renews'] ? 'renews' : 'ends' }} {{ day($sub['until'], false) }} · {{ $sub['months_paid'] }} months paid</p>
                @else
                    <p class="mt-2.5 text-[15px]">No subscription{{ $sub['months_paid'] ? ' now · '.$sub['months_paid'].' months paid before' : '' }}.</p>
                @endif
                @if ($sub['data'])
                    <div class="mt-3 flex flex-col gap-1.5 text-sm">
                        @foreach (array_slice($sub['data'], 0, 6) as $e)<div class="flex justify-between gap-2.5"><span>{{ ucfirst(str_replace('_', ' ', $e['type'])) }}{{ $e['period_type'] === 'trial' ? ' (trial)' : '' }}</span><span class="text-slate">{{ $e['price'] !== null ? money($e['price']).' · ' : '' }}{{ day($e['occurred_at'], false) }}</span></div>@endforeach
                    </div>
                @endif
                <form method="POST" action="{{ route('admin.user.sync', $user['id']) }}" class="mt-4 flex flex-wrap items-end gap-2.5">
                    @csrf
                    <div><label for="sp" class="label">Your password</label><input id="sp" name="password" type="password" autocomplete="current-password" required class="field h-11 w-56"></div>
                    <button class="btn-quiet">Check the store again</button>
                </form>
                <p class="mt-2 ml-1 text-[13px] text-slate">The subscription itself is the store’s. You can only add or end Premium on top of it.</p>
            </section>

            <section aria-labelledby="bu" class="card">
                <h2 id="bu" class="text-lg font-extrabold">Budgets</h2>
                <div class="mt-3.5 flex flex-col gap-3.5">
                    @forelse ($budgets as $b)
                        <div class="rounded-[18px] bg-canvas px-5 py-[18px]">
                            <div class="flex flex-wrap items-baseline justify-between gap-2.5"><span class="text-base font-extrabold">{{ $b['name'] }}</span><span class="chip {{ $b['premium']['active'] ? 'bg-mint' : 'bg-white text-slate' }}">{{ $status($b['premium']) }}</span></div>
                            <p class="mt-0.5 text-[13.5px] text-slate">{{ $b['role'] === 'owner' ? 'Owner' : 'Member' }} · {{ $b['members_count'] }} {{ $b['members_count'] === 1 ? 'member' : 'members' }}{{ $b['role'] !== 'owner' && $b['owner'] ? ' · owner '.$b['owner']['name'] : '' }}</p>
                            @if ($b['history'])
                                <div class="mt-3 flex flex-col gap-1.5 text-sm">
                                    @foreach (array_slice($b['history'], 0, 5) as $g)<div class="flex justify-between gap-2.5"><span>{{ $grantText($g) }}</span><span class="text-slate">{{ day($g['created_at'], false) }}{{ ($g['granted_by'] ?? null) ? ' · '.$g['granted_by'] : '' }}</span></div>@endforeach
                                </div>
                            @endif
                        </div>
                    @empty
                        <p class="sub">No budgets.</p>
                    @endforelse
                </div>
            </section>

            <section aria-labelledby="sp2" class="card">
                <div class="flex items-baseline justify-between gap-2.5"><h2 id="sp2" class="text-lg font-extrabold">Support</h2><a href="{{ route('admin.support') }}" class="link text-[14.5px]">Open inbox</a></div>
                @forelse ($u['support'] as $t)
                    <a href="{{ route('admin.support', ['thread' => $t['id'], 'status' => $t['status']]) }}" class="flex items-center gap-3 border-t border-rule py-3.5 first-of-type:mt-2">
                        <span class="flex-1"><span class="block text-[15px] font-bold">{{ $t['kind'] }}</span><span class="block text-[13px] text-slate">Started {{ day($t['created_at'], false) }} · {{ $t['messages_count'] }} {{ $t['messages_count'] === 1 ? 'message' : 'messages' }}</span></span>
                        <span class="chip {{ $t['status'] === 'open' ? 'bg-amber-tint text-amber-ink' : 'bg-tint text-teal' }}">{{ ucfirst($t['status']) }}</span>
                    </a>
                @empty
                    <p class="sub mt-2">No conversations.</p>
                @endforelse
            </section>
        </div>

        @if ($budgets)
            <aside class="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
                <form method="POST" action="{{ route('admin.user.premium', $user['id']) }}" x-data="grant" aria-labelledby="gp" class="card flex flex-col gap-4">
                    @csrf
                    <div><h2 id="gp" class="text-lg font-extrabold">Change Premium</h2><p class="mt-0.5 text-[13.5px] text-slate">On top of any subscription. Months add up, up to 12 ahead.</p></div>
                    <div><label for="gb" class="label">Budget</label><select id="gb" name="budget_id" class="field">@foreach ($budgets as $b)<option value="{{ $b['id'] }}">{{ $b['name'] }}</option>@endforeach</select></div>
                    <fieldset class="flex flex-col gap-2">
                        <legend class="label">What to do</legend>
                        <label class="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[15px] font-bold shadow-[inset_0_0_0_1.5px_#E7EAEA] has-checked:bg-tint-soft has-checked:shadow-[inset_0_0_0_2px_#03C7AA]"><input type="radio" name="action" value="months" checked @change="pick" class="size-[18px] accent-teal">Give months</label>
                        <div x-show="isMonths" class="flex gap-1.5 px-1">
                            @foreach ([1, 3, 6, 12] as $m)<label class="flex-1"><input type="radio" name="months" value="{{ $m }}" @checked($m === 3) class="peer sr-only"><span class="flex h-9 items-center justify-center rounded-[10px] bg-canvas text-sm font-bold peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-mint">{{ $m }}</span></label>@endforeach
                        </div>
                        <label class="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[15px] font-bold shadow-[inset_0_0_0_1.5px_#E7EAEA] has-checked:bg-tint-soft has-checked:shadow-[inset_0_0_0_2px_#03C7AA]"><input type="radio" name="action" value="until" @change="pick" class="size-[18px] accent-teal">Until a date</label>
                        <div x-cloak x-show="isUntil" class="px-1"><label for="gu" class="sr-only">Until</label><input id="gu" type="date" name="until" class="field h-11"></div>
                        <label class="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[15px] font-bold shadow-[inset_0_0_0_1.5px_#E7EAEA] has-checked:bg-tint-soft has-checked:shadow-[inset_0_0_0_2px_#03C7AA]"><input type="radio" name="action" value="forever" @change="pick" class="size-[18px] accent-teal">For good</label>
                        <label class="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[15px] font-bold text-red-ink shadow-[inset_0_0_0_1.5px_#E7EAEA] has-checked:bg-red-tint"><input type="radio" name="action" value="end" @change="pick" class="size-[18px] accent-red">End Premium today</label>
                    </fieldset>
                    @error('action')<p class="field-error">{{ $message }}</p>@enderror
                    @error('until')<p class="field-error">{{ $message }}</p>@enderror
                    <div><label for="gn" class="label">Note for the log</label><input id="gn" name="note" maxlength="120" class="field"></div>
                    <div><label for="gw" class="label">Your password</label><input id="gw" name="password" type="password" autocomplete="current-password" required class="field">@error('password')<p class="field-error">{{ $message }}</p>@enderror</div>
                    <button class="btn h-[52px]">Change Premium</button>
                </form>

                @if ($u['log'])
                    <section aria-labelledby="lg" class="card">
                        <h2 id="lg" class="text-lg font-extrabold">Admin log for {{ \Illuminate\Support\Str::before($user['name'], ' ') }}</h2>
                        <div class="mt-2 flex flex-col">
                            @foreach ($u['log'] as $a)<div class="border-t border-rule py-2.5 text-sm first:border-t-0"><b>{{ ucfirst(str_replace('_', ' ', $a['action'])) }}</b> <span class="text-slate">· {{ day($a['created_at']) }} · {{ $a['admin'] }}</span>@if ($a['note'])<div class="text-slate">{{ $a['note'] }}</div>@endif</div>@endforeach
                        </div>
                    </section>
                @endif
            </aside>
        @endif
    </div>
</x-layouts.app>
