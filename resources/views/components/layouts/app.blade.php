@props(['title', 'admin' => false])
<!doctype html>
<html lang="en-ZA">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $title }} · PocFin</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body data-idle-minutes="{{ $admin ? config('dashboard.admin_idle_minutes') : config('dashboard.idle_minutes') }}">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold">Skip to content</a>
    <form id="lock-form" method="POST" action="{{ route('lock-now') }}" class="hidden">@csrf</form>

    <div class="flex min-h-screen">
        <aside class="no-print hidden w-[248px] flex-none min-[860px]:block">@include('partials.nav')</aside>

        <div class="min-w-0 flex-1">
            {{-- Phone and small tablet: a top bar, and the same menu as a full-height panel. --}}
            <div x-data="toggle" class="no-print min-[860px]:hidden" @keydown.escape="shut">
                <header class="flex h-[60px] items-center gap-2 border-b border-line pr-2 pl-1">
                    <button type="button" @click="flip" :aria-expanded="open" aria-label="Open menu" class="grid size-11 place-items-center"><x-icon name="menu" :size="24" :stroke="2"/></button>
                    <x-logo :size="28"/>
                    <span class="flex-1 truncate text-[17px] font-extrabold">{{ $title }}</span>
                    @if ($b = $shell->budget())
                        <span class="flex h-9 items-center gap-1.5 rounded-full bg-white pr-2.5 pl-1.5 text-[13.5px] font-bold"><span class="grid size-[26px] place-items-center rounded-[9px] bg-tint text-[11px] font-extrabold text-teal">{{ \App\Services\Shell::initials($b['name']) }}</span><span class="max-w-[110px] truncate">{{ $b['name'] }}</span></span>
                    @endif
                </header>
                <div x-cloak x-show="open" role="dialog" aria-modal="true" aria-label="Menu" class="fixed inset-0 z-40 overflow-y-auto bg-canvas">
                    <button type="button" @click="shut" aria-label="Close menu" class="absolute top-[18px] right-2.5 z-10 grid size-11 place-items-center rounded-full bg-white"><x-icon name="x" :stroke="2.4"/></button>
                    @include('partials.nav')
                </div>
            </div>

            <main id="main" class="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 pt-4 pb-14 min-[860px]:px-8 min-[860px]:pt-7">
                {{ $slot }}
            </main>
        </div>
    </div>
</body>
</html>
