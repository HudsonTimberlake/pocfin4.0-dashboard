@php $counts = $list['counts'] ?? []; @endphp
<x-layouts.app title="Support" :admin="true">
    <header>@include('admin.badge')<h1 class="h1 mt-1.5">Support</h1></header>
    <x-status/>
    <div class="flex flex-wrap items-start gap-5">
        <nav aria-label="Conversations" class="min-w-0 flex-[1_1_300px] rounded-3xl bg-white pt-4 pb-2">
            <div class="flex flex-wrap gap-1.5 px-4 pb-3">
                @foreach (['open' => 'Open', 'answered' => 'Answered', 'closed' => 'Closed'] as $key => $label)
                    <a href="{{ route('admin.support', ['status' => $key]) }}" class="inline-flex h-[34px] items-center rounded-full px-3.5 text-[13.5px] font-bold {{ $status === $key ? 'bg-ink text-white' : 'bg-canvas' }}" @if ($status === $key) aria-current="page" @endif>{{ $label }} {{ $counts[$key] ?? 0 }}</a>
                @endforeach
            </div>
            @forelse ($list['data'] ?? [] as $t)
                @php $on = $thread && $thread['id'] === $t['id']; @endphp
                <a href="{{ route('admin.support', ['status' => $status, 'thread' => $t['id']]) }}" @if ($on) aria-current="page" @endif class="flex gap-3 border-t border-rule px-4 py-3.5 {{ $on ? 'bg-tint-soft' : '' }}">
                    <span class="mt-[7px] size-2 flex-none rounded-full {{ $t['unread'] ? 'bg-mint' : '' }}" aria-hidden="true"></span>
                    <span class="min-w-0 flex-1">
                        <span class="flex justify-between gap-2"><span class="truncate text-[15px] font-bold">{{ $t['user']['name'] ?? 'Deleted user' }}</span><span class="flex-none text-[12.5px] text-slate">{{ day($t['last_message_at']) }}</span></span>
                        <span class="block text-[13px] font-bold text-slate">{{ $t['subject'] }}</span>
                        <span class="block truncate text-[13.5px] text-slate">{{ $t['preview'] }}</span>
                    </span>
                </a>
            @empty
                <p class="sub border-t border-rule px-4 pt-3.5">Nothing here.</p>
            @endforelse
        </nav>

        @if ($thread)
            <section aria-labelledby="th" class="card flex min-w-0 flex-[999_1_460px] flex-col gap-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div><h2 id="th" class="text-xl font-extrabold">{{ $thread['subject'] }}</h2><p class="mt-0.5 text-[13.5px] text-slate">{{ $thread['user']['name'] ?? 'Deleted user' }} · started {{ day($thread['created_at']) }}</p></div>
                    <form method="POST" action="{{ route('admin.support.status', $thread['id']) }}" class="flex items-end gap-2">
                        @csrf
                        <input type="hidden" name="to" value="{{ $thread['status'] === 'closed' ? 'reopen' : 'close' }}">
                        <label for="cp" class="sr-only">Your password</label><input id="cp" name="password" type="password" placeholder="Your password" autocomplete="current-password" required class="field h-[38px] w-40 text-sm">
                        <button class="btn-quiet h-[38px] text-sm">{{ $thread['status'] === 'closed' ? 'Reopen' : 'Close' }}</button>
                    </form>
                </div>
                @foreach ($thread['messages'] as $m)
                    <article class="flex flex-col gap-2 rounded-[18px] px-4 py-3.5 {{ $m['from_admin'] ? 'bg-tint' : 'bg-canvas' }}">
                        <div class="flex items-center gap-2 text-[13.5px] font-bold {{ $m['from_admin'] ? 'text-teal' : '' }}">{{ $m['author'] }}<span class="ml-auto font-medium text-slate">{{ day($m['created_at']) }}, {{ \Illuminate\Support\Carbon::parse($m['created_at'])->setTimezone(session('timezone', 'Africa/Johannesburg'))->format('H:i') }}</span></div>
                        <div class="text-[15.5px] leading-[23px] whitespace-pre-line">{{ $m['body'] }}</div>
                        @if ($m['attachments'])
                            <div class="flex flex-wrap gap-2">@foreach ($m['attachments'] as $a)<a href="{{ route('admin.support.attachment', $a['id']) }}" target="_blank" rel="noopener" class="block"><img src="{{ route('admin.support.attachment', $a['id']) }}" alt="Screenshot" class="h-[120px] w-auto rounded-[10px] shadow-[0_0_0_1.5px_#E7EAEA]"></a>@endforeach</div>
                        @endif
                        @if ($m['device'] ?? null)<div class="text-[12.5px] text-slate">{{ collect([($m['device']['app_version'] ?? null) ? 'PocFin '.$m['device']['app_version'] : null, $m['device']['device_model'] ?? null, ($m['device']['os_version'] ?? null) ? (($m['device']['platform'] ?? '') === 'android' ? 'Android ' : 'iOS ').$m['device']['os_version'] : null])->filter()->join(' · ') }}</div>@endif
                    </article>
                @endforeach
                <form method="POST" action="{{ route('admin.support.reply', $thread['id']) }}" class="flex flex-col gap-2.5">
                    @csrf
                    <label for="rp" class="label mb-0">Reply to {{ \Illuminate\Support\Str::before($thread['user']['name'] ?? 'them', ' ') }}</label>
                    <textarea id="rp" name="body" rows="5" required maxlength="5000" class="w-full resize-y rounded-[14px] border-[1.5px] border-line px-4 py-3.5 text-[15.5px] leading-[23px] outline-none focus:border-ink">{{ old('body') }}</textarea>
                    @error('body')<p class="field-error">{{ $message }}</p>@enderror
                    <div class="flex flex-wrap items-end justify-between gap-2.5">
                        <span class="text-[13px] text-slate">They get a notice by email and push, without your text.</span>
                        <div class="flex items-end gap-2"><label for="rpw" class="sr-only">Your password</label><input id="rpw" name="password" type="password" placeholder="Your password" autocomplete="current-password" required class="field h-[46px] w-44"><button class="btn h-[46px]">Send reply</button></div>
                    </div>
                    @error('password')<p class="field-error">{{ $message }}</p>@enderror
                </form>
            </section>

            @if ($thread['about'] ?? null)
                <aside aria-labelledby="ab" class="card flex min-w-0 flex-[1_1_260px] flex-col gap-3">
                    <h2 id="ab" class="text-base font-extrabold">About {{ \Illuminate\Support\Str::before($thread['user']['name'] ?? '', ' ') }}</h2>
                    <div class="text-sm leading-[21px]"><div class="text-[12.5px] font-bold text-slate">Joined</div>{{ day($thread['about']['joined_at'], false) }} · {{ $thread['about']['verified'] ? 'verified' : 'not verified' }}</div>
                    <div class="text-sm leading-[21px]"><div class="text-[12.5px] font-bold text-slate">Budgets</div>@foreach ($thread['about']['budgets'] as $b){{ $b['name'] }} · {{ $b['role'] }} · {{ $b['members_count'] }} {{ $b['members_count'] === 1 ? 'member' : 'members' }} · {{ $b['premium'] }}<br>@endforeach</div>
                    @if ($thread['user']['id'] ?? null)<a href="{{ route('admin.user', $thread['user']['id']) }}" class="link mt-1 text-[14.5px]">Open their account</a>@endif
                </aside>
            @endif
        @endif
    </div>
</x-layouts.app>
