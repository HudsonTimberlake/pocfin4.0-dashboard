@php $r = $referrals; @endphp
<x-layouts.app title="Invite friends">
    <header><h1 class="h1">Invite friends</h1><p class="sub mt-0.5">You both get a free month of Premium</p></header>
    <div class="flex max-w-[1040px] flex-col gap-5">
        <x-status/>
        <section aria-labelledby="cd" class="flex flex-wrap items-center gap-6 rounded-[28px] bg-[linear-gradient(165deg,#F2FCFA_0%,#DDF4EF_60%,#C4EBE3_100%)] px-8 py-7">
            <div class="min-w-[260px] flex-1">
                <h2 id="cd" class="text-[15px] font-bold text-teal">Your code</h2>
                <div class="mt-1 text-[48px] leading-[56px] font-extrabold tracking-[0.02em]">{{ $r['code'] ?? '' }}</div>
                <div class="mt-1 text-[15px] break-all text-[#3E5B57]">{{ $r['link'] ?? '' }}</div>
            </div>
            <div class="flex flex-wrap gap-2.5">
                <button type="button" data-copy="{{ $r['link'] ?? '' }}" class="btn"><x-icon name="copy" :size="18" :stroke="2"/><span data-label>Copy link</span></button>
                <button type="button" data-copy="{{ $r['code'] ?? '' }}" class="inline-flex h-12 items-center rounded-[14px] bg-white px-5 font-bold"><span data-label>Copy code</span></button>
            </div>
        </section>

        <section aria-labelledby="hw" class="card px-7">
            <h2 id="hw" class="h2">How it works</h2>
            <ol class="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
                <li class="flex gap-3"><span class="grid size-8 flex-none place-items-center rounded-full bg-tint font-extrabold text-teal">1</span><span class="text-[15px] leading-[22px]">Send your link. It fills in your code when they sign up.</span></li>
                <li class="flex gap-3"><span class="grid size-8 flex-none place-items-center rounded-full bg-tint font-extrabold text-teal">2</span><span class="text-[15px] leading-[22px]">They record their first expense in PocFin.</span></li>
                <li class="flex gap-3"><span class="grid size-8 flex-none place-items-center rounded-full bg-tint font-extrabold text-teal">3</span><span class="text-[15px] leading-[22px]">You each get a month of Premium. Months add up, up to {{ $r['max_months_ahead'] ?? 12 }} ahead.</span></li>
            </ol>
        </section>

        <div class="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
            <section aria-labelledby="fr" class="card px-7">
                <div class="flex items-baseline justify-between gap-2.5"><h2 id="fr" class="h2">Friends who joined</h2><span class="text-sm font-bold text-teal">{{ $r['months_earned'] ?? 0 }} {{ ($r['months_earned'] ?? 0) === 1 ? 'month' : 'months' }} earned</span></div>
                <div class="mt-3">
                    @forelse ($r['friends'] ?? [] as $f)
                        <div class="flex items-center gap-3 border-t border-rule py-3.5">
                            <span class="grid size-[34px] flex-none place-items-center rounded-full {{ $f['rewarded'] ? 'bg-tint text-teal' : 'bg-canvas text-slate' }} text-[13px] font-extrabold" aria-hidden="true">{{ initials($f['name']) }}</span>
                            <span class="flex-1"><span class="block text-[15px] font-bold">{{ $f['name'] }}</span><span class="block text-[13px] text-slate">{{ $f['rewarded'] ? 'Free month earned' : 'Joined '.day($f['joined_at'], false).', waiting for a first expense' }}</span></span>
                            @if ($f['rewarded'])<x-icon name="check" :stroke="2.4" class="text-teal"/>@endif
                        </div>
                    @empty
                        <p class="sub border-t border-rule pt-3.5">Nobody yet. Send your link to someone who’d like a calmer budget.</p>
                    @endforelse
                </div>
            </section>

            <form method="POST" action="{{ route('invite.budget') }}" aria-labelledby="gt" class="card px-7">
                @csrf
                <h2 id="gt" class="h2">Where your months go</h2>
                <p class="mt-0.5 text-sm text-slate">The budget that gets your free months</p>
                <label for="bg" class="sr-only">Budget</label>
                <select id="bg" name="budget_id" class="field mt-3.5">
                    @foreach ($budgets as $b)<option value="{{ $b['id'] }}" @selected(($r['budget']['id'] ?? null) === $b['id'])>{{ $b['name'] }}</option>@endforeach
                </select>
                <button class="btn mt-3.5">Save</button>
            </form>
        </div>
    </div>
</x-layouts.app>
