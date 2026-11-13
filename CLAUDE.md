# PocFin dashboard (dashboard.pocfin.com)

The web view of PocFin: people sign in with their app account and see their budget on a bigger screen, plus an account area and, for admin emails, a support area. Plan and decisions: `../design/dashboard.md`. Boards: the "PocFin Dashboard" Design canvas (source in `../design/dashboard-canvas/`). The API's side is in `../pocfin4.0-api/CLAUDE.md` ("Web dashboard").

## Stack
- Laravel 13, Blade, Vite, Tailwind CSS v4 (tokens in `resources/css/app.css` `@theme`, the same as pocfin.com), Manrope self-hosted.
- Alpine's **CSP build** (`@alpinejs/csp`): no eval, so every component is in `resources/js/app.js` and the markup only names them.
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
- `SecurityHeaders`: strict CSP (scripts from this site only, no eval, no framing), `no-store`, HSTS on HTTPS. No analytics or trackers here.
- Admin pages are for `user.is_admin` (404 otherwise), but the API checks every admin call again. Admin changes send the admin's password, which the API checks and logs. Admins see account and Premium only, never another user's money.
- Receipts and support screenshots are streamed through this app, so the browser never needs the API token.
- Copy: SA/UK English, calm, "It all has a place", never "every rand has a job".

## API calls
- Every page makes **one** call to its own endpoint under the API's `/dashboard/*` (API: `app/Http/Controllers/Dashboard/`; see "Dashboard endpoints" in its CLAUDE.md). The only paths this app may call are listed in `config/dashboard.php` `api_paths`; `Api` refuses any other (an exception outside production, a log line in production). To add a call: add a dashboard endpoint (with its contract test) first, never change an app endpoint for the dashboard.
- Slow page? Set `DASHBOARD_LOG_TIMING=true` in `.env` (and `php artisan config:clear`): `storage/logs/laravel.log` then gets one `api` line per call with its milliseconds. Turn it off again afterwards.

## Tests
`php artisan test` (32 tests, the API faked with `Http::fake`, `Http::preventStrayRequests`). Build assets with `npm run build`.

## Server
A Laravel app on the `dashboard.pocfin.com` subdomain (HostAfrica), document root `public/`. `.env`: `APP_URL=https://dashboard.pocfin.com`, `APP_ENV=production`, `APP_DEBUG=false`, `POCFIN_API_URL=https://api.pocfin.com/api`, `DASHBOARD_KEY` (the same value as the API's), `SESSION_SECURE_COOKIE=true`, `SESSION_DRIVER=file`, `SESSION_LIFETIME=720`, `SESSION_ENCRYPT=true`, and leave `SESSION_DOMAIN` empty (the cookie stays on the subdomain).
