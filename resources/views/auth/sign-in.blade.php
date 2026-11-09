<x-layouts.plain title="Sign in">
    <form method="POST" action="{{ route('sign-in') }}" class="hero flex flex-col gap-[18px] p-9" novalidate>
        @csrf
        <input type="hidden" name="timezone" value="">
        <div>
            <h1 class="text-[28px] leading-[34px] font-extrabold tracking-[-0.025em]">Sign in to your budget</h1>
            <p class="mt-2 text-[15.5px] leading-[23px] text-slate">Use the email and password you use in the PocFin app.</p>
        </div>
        <x-status/>
        <div>
            <label for="email" class="label">Email</label>
            <input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" required autofocus class="field">
            @error('email')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <div>
            <div class="mx-1 mb-1.5 flex items-baseline justify-between"><label for="password" class="text-[13.5px] font-bold text-slate">Password</label><a href="{{ route('forgot') }}" class="link text-[13.5px]">Forgot password?</a></div>
            <div class="relative">
                <input id="password" name="password" type="password" autocomplete="current-password" required class="field pr-14">
                <button type="button" data-reveal="password" aria-label="Show password" aria-pressed="false" class="absolute top-1 right-1 grid size-11 place-items-center text-slate"><x-icon name="eye" :size="22"/></button>
            </div>
            @error('password')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <button class="btn mt-1 h-[54px] text-[16.5px]">Sign in</button>
    </form>
    <p class="mt-6 text-center text-[15px] text-slate">New to PocFin? <a href="{{ config('dashboard.site_url') }}/#download" class="link">Get the app</a> to make your account.</p>
</x-layouts.plain>
