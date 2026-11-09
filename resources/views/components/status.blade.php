@if (session('status'))
    <div role="status" class="flex items-center gap-2 rounded-2xl bg-tint px-4 py-3 text-[14.5px] font-bold text-teal"><x-icon name="check" :size="18" :stroke="2.4"/>{{ session('status') }}</div>
@endif
@error('form')
    <div role="alert" class="rounded-2xl bg-red-tint px-4 py-3 text-[14.5px] font-bold text-red-ink">{{ $message }}</div>
@enderror
