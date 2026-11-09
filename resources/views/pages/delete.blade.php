@php
    $store = $subscription['store'] ?? null;
@endphp
<x-layouts.app title="Delete account">
    <header class="max-w-[760px]">
        <a href="{{ route('account') }}" class="link inline-flex h-8 items-center gap-0.5 text-[15px]"><x-icon name="back" :size="18" :stroke="2.4"/>Profile and security</a>
        <h1 class="h1 mt-1.5">Delete your account</h1>
    </header>
    <div class="flex max-w-[760px] flex-col gap-5">
        <section aria-labelledby="wh" class="card px-7">
            <h2 id="wh" class="text-lg font-extrabold">What happens</h2>
            <ul class="mt-3.5 flex flex-col gap-3.5">
                <li class="flex gap-3"><span class="grid size-7 flex-none place-items-center rounded-full bg-red-tint text-red"><x-icon name="x" :size="16" :stroke="2.6"/></span><span class="text-[15px] leading-[22px]"><b>Every budget only you are in is erased</b>, with everything in it: envelopes, transactions, accounts, investments, notes, saved calculations and receipt photos.</span></li>
                <li class="flex gap-3"><span class="grid size-7 flex-none place-items-center rounded-full bg-red-tint text-red"><x-icon name="x" :size="16" :stroke="2.6"/></span><span class="text-[15px] leading-[22px]"><b>Your account goes</b>, and you’re signed out of the app and this dashboard everywhere.</span></li>
                <li class="flex gap-3"><span class="grid size-7 flex-none place-items-center rounded-full bg-tint text-teal"><x-icon name="check" :size="16" :stroke="2.6"/></span><span class="text-[15px] leading-[22px]"><b>Shared budgets stay</b> for the other people in them. What you recorded there stays, without your name, and your notes in them are deleted.</span></li>
            </ul>
            <p class="mt-4 text-[15px] font-bold text-red-ink">It happens straight away and can’t be undone.</p>
        </section>

        @if ($blocked)
            <section role="alert" class="flex gap-3.5 rounded-3xl bg-amber-tint px-7 py-6">
                <span class="grid size-10 flex-none place-items-center rounded-full bg-white text-[#A35C00]"><x-icon name="warning" :stroke="2"/></span>
                <div><h2 class="text-[17px] font-extrabold">Not yet</h2><p class="mt-1.5 text-[15px] leading-[22px] text-[#5C3B12]">{{ $blocked }} You can do that in the app, then come back.</p></div>
            </section>
        @endif

        @if ($subscription['active'] ?? false)
            <section class="flex items-start gap-3.5 rounded-3xl bg-navy-tint px-6 py-5">
                <x-icon name="info" :size="22" class="mt-0.5 text-navy"/>
                <div><h2 class="text-base font-extrabold text-navy">Your subscription doesn’t stop by itself</h2><p class="mt-1 text-[14.5px] leading-[21px] text-navy-ink">Cancel it in {{ $store === 'play_store' ? 'Google Play' : 'the App Store' }} first, or you’ll keep being charged. <a href="{{ config('dashboard.manage_urls.'.($store === 'play_store' ? 'play_store' : 'app_store')) }}" target="_blank" rel="noopener" class="link">Manage it there</a></p></div>
            </section>
        @endif

        <form method="POST" action="{{ route('account.delete') }}" aria-labelledby="cf" class="card flex flex-col gap-4 px-7">
            @csrf
            <h2 id="cf" class="text-lg font-extrabold">Confirm it’s you</h2>
            <div><label for="dp" class="label">Password</label><input id="dp" name="password" type="password" autocomplete="current-password" required class="field">@error('password')<p class="field-error">{{ $message }}</p>@enderror</div>
            <label class="flex items-start gap-3 text-[15px] leading-[22px]"><input type="checkbox" name="understood" value="1" class="mt-0.5 size-[22px] flex-none accent-red">I understand my account and every budget only I am in will be erased for good.</label>
            @error('understood')<p class="field-error">{{ $message }}</p>@enderror
            <div class="flex flex-wrap gap-2.5"><button class="btn-red">Delete my account</button><a href="{{ route('account') }}" class="link inline-flex h-12 items-center px-4">Keep my account</a></div>
        </form>
    </div>
</x-layouts.app>
