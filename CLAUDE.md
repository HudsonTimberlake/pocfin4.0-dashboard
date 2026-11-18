# PocFin dashboard (dashboard.pocfin.com)

The web view of PocFin: people sign in with their app account and see their budget on a bigger screen, plus an account area and, for admin emails, a support area. Plan and decisions: `../design/dashboard.md`. Boards: the "PocFin Dashboard" Design canvas (source in `../design/dashboard-canvas/`). The API's side is in `../pocfin4.0-api/CLAUDE.md` ("Web dashboard").

## Stack
- Laravel 13, Vite, Tailwind CSS v4, Manrope self-hosted.
- **Version 2 (from 2026-11-17, `../design/dashboard-v2.md`): Inertia 3 + React 19 + TypeScript**, `motion` for animation. Pages in `resources/js/pages` (each sets `Page.layout` to `Shell`, so the menu stays mounted), shared parts in `resources/js/components`, the app's own `money.ts`, `envelopeIcons.ts`, `fillHint.ts`, `calculators.ts` and `goalPlan.ts` copied to `resources/js/shared` (plus `goals.ts`, the display helpers of the app's `goalsApi.ts` without its API calls) (keep in step with `pocfin4.0-app/src/lib`). Root view `resources/views/inertia.blade.php`; shared props in `HandleInertiaRequests` (never the API token). History encryption on, no SSR. Pages move over one at a time; until then the menu links to the release 1 Blade pages with plain links (full load).
- Colours are CSS variables in `resources/css/app.css` (light in `:root`, dark under `[data-theme="dark"]`), mapped to Tailwind names with `@theme inline`. Only the React root view sets `data-theme` (from the `appearance` cookie: system, light or dark), so Blade pages stay light. Use `bg-card` (not `bg-white`) in React.
- Writes that shouldn't reload the page (History) are small JSON calls through `resources/js/lib/http.ts` (`send`, CSRF header, a 422 comes back as `Refused` with field messages). The server answers JSON (`Api::ok` turns the API's 422 into a validation error; History turns a 403 into a message).
- From React, a redirect to a Blade page must be `leave($url)` (an Inertia location answer, a full load), as in `SignedIn`, `IdleLock` and the exception handlers.
- Release 1 Blade pages: Alpine's **CSP build** (`@alpinejs/csp`): no eval, so every component is in `resources/js/app.js` and the markup only names them.
- **No database.** Sessions and cache are files. Everything else comes from the API through `App\Services\Api`.

## How sign-in works
- `POST /sign-in` calls the API's `/login` with `client: web` (a token that expires after 12 hours). The token is kept **encrypted in the server-side session** (`Api::storeToken`), never in a cookie or the page.
- Every API call sends the visitor's time zone (`X-Timezone`, from the sign-in form) and, with `DASHBOARD_KEY`, their address (`X-Dashboard-Client-Ip`) for the API's rate limits.
- Unverified accounts enter the email code first; admin emails enter an emailed code at every sign-in (`pending_code` in the session, `/code`).
- A 401 from the API signs the visitor out (`SignedOut`); `admin_code_required` sends an admin to the code (`AdminCodeRequired`); a 5xx or no answer shows `errors/api` (`ApiUnavailable`).
- `IdleLock`: after 15 minutes without use (10 on admin pages) the page locks; the password is checked with `POST /user/password/check`. The page also locks itself in the browser (`#lock-form`).

## Rules
- **Read only** in release 1, apart from account settings (name, password, sessions, covered budgets, referral budget, delete) and admin support actions. Money is changed in the app.
- Money is shown from the API's decimal strings with `App\Support\Money` / `money()` / `money_big()`: digits regrouped, never floats.
- **Nothing sensitive in addresses or logs:** search words and admin searches are posted and kept in the session (`history_filters`, `admin_filters`); only page numbers, tabs and ids go in the URL.
- `SecurityHeaders`: strict CSP (scripts from this site only plus a per-page nonce for our own inline script, no eval, no framing), `no-store`, HSTS on HTTPS. No analytics or trackers here.
- Admin pages are for `user.is_admin` (404 otherwise), but the API checks every admin call again. Admin changes send the admin's password, which the API checks and logs. Admins see account and Premium only, never another user's money.
- Receipts and support screenshots are streamed through this app, so the browser never needs the API token.
- Copy: SA/UK English, calm, "It all has a place", never "every rand has a job".

## API calls
- Every page makes **one** call to its own endpoint under the API's `/dashboard/*` (API: `app/Http/Controllers/Dashboard/`; see "Dashboard endpoints" in its CLAUDE.md). The only paths this app may call are listed in `config/dashboard.php` `api_paths`; `Api` refuses any other (an exception outside production, a log line in production). To add a call: add a dashboard endpoint (with its contract test) first, never change an app endpoint for the dashboard.
- Slow page? Set `DASHBOARD_LOG_TIMING=true` in `.env` (and `php artisan config:clear`): `storage/logs/laravel.log` then gets one `api` line per call with its milliseconds. Turn it off again afterwards.

## Tests
`php artisan test` (76 tests, the API faked with `Http::fake`, `Http::preventStrayRequests`). Build assets with `npm run build`; type-check with `npx tsc --noEmit`. To look at pages without a real account: the `dashboard-fake-api` and `pocfin-dashboard-sample` entries in `../.claude/launch.json` serve sample figures (`scripts/fake-api.php`) on port 8021; any sign-in works, so no real account is needed.

## Server
A Laravel app on the `dashboard.pocfin.com` subdomain (HostAfrica), document root `public/`. `.env`: `APP_URL=https://dashboard.pocfin.com`, `APP_ENV=production`, `APP_DEBUG=false`, `POCFIN_API_URL=https://api.pocfin.com/api`, `DASHBOARD_KEY` (the same value as the API's), `SESSION_SECURE_COOKIE=true`, `SESSION_DRIVER=file`, `SESSION_LIFETIME=720`, `SESSION_ENCRYPT=true`, and leave `SESSION_DOMAIN` empty (the cookie stays on the subdomain).

## Calculators (W16, 2026-11-18)
`/calculators`: the maths runs in the browser (`shared/calculators.ts`); the server only keeps saved inputs (`/calculators/saved`, JSON via `send`). Saved inputs use the app's own keys, so they open on the phone. "Make this a goal" leaves `pocfin-goal-prefill` in sessionStorage (`lib/calcGoal.ts`) and opens `/goals?new=1`; a value goal's "Open in Retirement calculator" leaves `pocfin-calc-prefill`. Goals' store passes a value goal's plan fields (raise, growth, spread, inflation, ages).
