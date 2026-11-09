<x-layouts.plain title="Forgot password">
    <form method="POST" action="{{ route('forgot') }}" class="hero flex flex-col gap-[18px] p-9">
        @csrf
        <div>
            <h1 class="text-[28px] leading-[34px] font-extrabold tracking-[-0.025em]">Forgot your password?</h1>
            <p class="mt-2 text-[15.5px] leading-[23px] text-slate">We’ll email you a code to set a new one.</p>
        </div>
        <div>
            <label for="email" class="label">Email</label>
            <input id="email" name="email" type="email" value="{{ old('email') }}" autocomplete="email" required autofocus class="field">
            @error('email')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <button class="btn h-[54px] text-[16.5px]">Send the code</button>
    </form>
    <p class="mt-6 text-center text-[15px]"><a href="{{ route('sign-in') }}" class="link">Back to sign in</a></p>
</x-layouts.plain>
