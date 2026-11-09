@props(['title'])
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
<body>
    <div class="flex min-h-screen flex-col items-center px-4 pt-16 pb-8">
        <a href="{{ config('dashboard.site_url') }}" class="flex items-center gap-2.5"><x-logo :size="40"/><span class="text-2xl font-extrabold tracking-[-0.02em]">PocFin</span></a>
        <main class="mt-10 w-full max-w-[440px]">{{ $slot }}</main>
        <footer class="mt-auto flex flex-wrap justify-center gap-5 pt-12 text-[13.5px] text-slate">
            <a href="{{ config('dashboard.site_url') }}">pocfin.com</a>
            <a href="{{ config('dashboard.site_url') }}/privacy-policy">Privacy policy</a>
            <a href="{{ config('dashboard.site_url') }}/terms">Terms</a>
            <span>PocFin is a budgeting tool, not financial advice.</span>
        </footer>
    </div>
</body>
</html>
