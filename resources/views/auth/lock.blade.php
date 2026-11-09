<x-layouts.plain title="Locked">
    <form method="POST" action="{{ route('lock') }}" class="hero flex flex-col gap-[18px] p-8">
        @csrf
        <span class="grid size-14 place-items-center rounded-full bg-tint text-teal"><x-icon name="lock" :size="26"/></span>
        <div>
            <h1 class="text-[26px] leading-8 font-extrabold tracking-[-0.02em]">Locked while you were away</h1>
            <p class="mt-1.5 text-[15px] leading-[22px] text-slate">Enter your password to carry on, {{ \Illuminate\Support\Str::before($name ?? '', ' ') }}.</p>
        </div>
        <div>
            <label for="password" class="label">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required autofocus class="field">
            @error('password')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <button class="btn h-[54px] text-[16.5px]">Unlock</button>
    </form>
    <form method="POST" action="{{ route('sign-out') }}" class="mt-5 text-center text-[14.5px] text-slate">@csrf Not you? <button class="link">Sign out</button></form>
</x-layouts.plain>
