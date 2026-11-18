@php($appearance = \App\Http\Middleware\HandleInertiaRequests::appearance(request()))
<!doctype html>
<html lang="en-ZA" data-appearance="{{ $appearance }}" @if ($appearance !== 'system') data-theme="{{ $appearance }}" @endif>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    {{-- System appearance: pick light or dark before the first paint, so there's no flash. --}}
    <script nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">
        (function () {
            var h = document.documentElement;
            if (h.dataset.appearance === 'system') {
                h.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
        })();
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
