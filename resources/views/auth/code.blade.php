<x-layouts.plain title="Check your email">
    <form method="POST" action="{{ route('code') }}" class="hero flex flex-col gap-5 p-9">
        @csrf
        <span class="grid size-14 place-items-center rounded-full bg-tint text-teal"><x-icon name="mail" :size="26"/></span>
        <div>
            <h1 class="text-[28px] leading-[34px] font-extrabold tracking-[-0.025em]">Check your email</h1>
            <p class="mt-2 text-[15.5px] leading-[23px] text-slate">We sent a 6-digit code to <b class="font-bold text-ink">{{ $email }}</b>. It works for a few minutes.</p>
        </div>
        <x-status/>
        <div>
            <label for="code" class="label">Code</label>
            <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required autofocus class="field h-[60px] text-center text-2xl font-extrabold tracking-[0.5em]">
            @error('code')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <button class="btn h-[54px] text-[16.5px]">Continue</button>
    </form>
    <div class="mt-5 flex flex-wrap justify-between gap-3 px-2 text-[14.5px]">
        <form method="POST" action="{{ route('code.resend') }}">@csrf<button class="link">Send a new code</button></form>
        <form method="POST" action="{{ route('sign-out') }}">@csrf<button class="link">Use a different account</button></form>
    </div>
</x-layouts.plain>
