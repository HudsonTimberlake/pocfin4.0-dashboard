@php $user = $shell->user(); @endphp
<x-layouts.app title="Profile and security">
    <header class="max-w-[880px]"><h1 class="h1">Profile and security</h1><p class="sub mt-0.5">Changes here apply in the app too</p></header>
    <div class="flex max-w-[880px] flex-col gap-5">
        <x-status/>
        <form method="POST" action="{{ route('account.profile') }}" aria-labelledby="pr" class="card flex flex-col gap-4 px-7">
            @csrf
            <h2 id="pr" class="h2">Profile</h2>
            <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
                <div><label for="name" class="label">Name</label><input id="name" name="name" value="{{ old('name', $user['name'] ?? '') }}" autocomplete="name" class="field">@error('name')<p class="field-error">{{ $message }}</p>@enderror</div>
                <div><label for="email" class="label">Email</label><input id="email" value="{{ $user['email'] ?? '' }}" readonly class="field border-0 bg-canvas text-slate"><p class="mt-1.5 ml-1 text-[13px] text-slate">Changing your email isn’t available yet.</p></div>
            </div>
            <div><button class="btn">Save</button></div>
        </form>

        <form method="POST" action="{{ route('account.password') }}" aria-labelledby="pw" class="card flex flex-col gap-4 px-7">
            @csrf
            <div><h2 id="pw" class="h2">Password</h2><p class="mt-0.5 text-sm text-slate">Changing it signs out your other devices.</p></div>
            <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
                <div><label for="cp" class="label">Current password</label><input id="cp" name="current_password" type="password" autocomplete="current-password" class="field">@error('current_password')<p class="field-error">{{ $message }}</p>@enderror</div>
                <div><label for="np" class="label">New password</label><input id="np" name="password" type="password" autocomplete="new-password" class="field">@error('password')<p class="field-error">{{ $message }}</p>@enderror</div>
                <div><label for="np2" class="label">New password again</label><input id="np2" name="password_confirmation" type="password" autocomplete="new-password" class="field"></div>
            </div>
            <div><button class="btn">Change password</button></div>
        </form>

        <section aria-labelledby="ss" class="rounded-3xl bg-white pt-6 pb-2">
            <div class="px-7"><h2 id="ss" class="h2">Where you’re signed in</h2><p class="mt-0.5 text-sm text-slate">Don’t recognise one? Sign out everywhere else, then change your password.</p></div>
            <div class="mt-3">
                @foreach ($sessions as $s)
                    <div class="flex items-center gap-3.5 border-t border-rule px-7 py-3.5">
                        <span class="grid size-10 flex-none place-items-center rounded-full bg-canvas text-slate"><x-icon :name="$s['client'] === 'web' ? 'laptop' : 'phone'"/></span>
                        <div class="min-w-0 flex-1"><div class="truncate text-[15px] font-bold">{{ $s['client'] === 'web' ? $s['name'] : 'PocFin app · '.$s['name'] }}</div><div class="text-[13px] text-slate">{{ $s['last_used_at'] ? 'Last used '.strtolower(day($s['last_used_at'])) : 'Signed in '.strtolower(day($s['created_at'])) }}</div></div>
                        @if ($s['current'])<span class="chip bg-tint text-teal">This browser</span>@endif
                    </div>
                @endforeach
            </div>
            <form method="POST" action="{{ route('account.sessions') }}" class="px-7 pt-3 pb-4">@csrf<button class="btn-quiet">Sign out everywhere else</button></form>
        </section>

        <section aria-labelledby="dl" class="card flex flex-wrap items-center gap-4 px-7">
            <div class="min-w-[280px] flex-1"><h2 id="dl" class="h2">Delete account</h2><p class="mt-1 text-sm leading-[21px] text-slate">Erases your account and every budget only you are in, straight away. It can’t be undone.</p></div>
            <a href="{{ route('account.delete') }}" class="inline-flex h-11 items-center rounded-[14px] bg-red-tint px-4 text-[15px] font-bold text-red-ink">Delete account</a>
        </section>
    </div>
</x-layouts.app>
