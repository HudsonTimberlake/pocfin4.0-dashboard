<x-layouts.plain title="New password">
    <form method="POST" action="{{ route('reset') }}" class="hero flex flex-col gap-[18px] p-9">
        @csrf
        <div>
            <h1 class="text-[28px] leading-[34px] font-extrabold tracking-[-0.025em]">Set a new password</h1>
            <p class="mt-2 text-[15.5px] leading-[23px] text-slate">If <b class="font-bold text-ink">{{ $email }}</b> has a PocFin account, we’ve emailed it a code. Changing your password signs you out everywhere.</p>
        </div>
        <div>
            <label for="code" class="label">Code</label>
            <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required class="field tracking-[0.3em]">
            @error('code')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <div>
            <label for="password" class="label">New password</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required class="field">
            @error('password')<p class="field-error">{{ $message }}</p>@enderror
        </div>
        <div>
            <label for="password_confirmation" class="label">New password again</label>
            <input id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" required class="field">
        </div>
        <button class="btn h-[54px] text-[16.5px]">Change password</button>
    </form>
</x-layouts.plain>
