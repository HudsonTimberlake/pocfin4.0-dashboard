# PocFin dashboard

dashboard.pocfin.com: PocFin on a bigger screen. See `CLAUDE.md`.

```bash
composer install
npm install && npm run build
cp .env.example .env && php artisan key:generate
php artisan serve --port=8020
```

Locally, point `POCFIN_API_URL` at a running API (`http://127.0.0.1:8000/api`) whose database has the migration `2026_11_09_120000_add_dashboard`.

## Putting it on HostAfrica

1. On your Mac: `bash scripts/package-for-hostafrica.sh` makes `deploy-out/pocfin-dashboard.zip`.
2. In cPanel's File Manager, upload it straight into your home folder `/home/<cpuser>/` (where `pocfin-api` is, **not** inside `public_html` and not inside a folder you made) and extract it there. The zip holds a `pocfin-dashboard` folder, so you get `/home/<cpuser>/pocfin-dashboard/` with `artisan` directly inside it. Check with `ls ~/pocfin-dashboard` in the terminal: you should see `artisan`, `app`, `public`, `vendor`, not another `pocfin-dashboard`.
3. cPanel → Domains: create `dashboard.pocfin.com` with document root `/home/<cpuser>/pocfin-dashboard/public`. Run AutoSSL (SSL/TLS Status) so it has HTTPS.
4. In `pocfin-dashboard/`, copy `.env.example` to `.env` and set `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://dashboard.pocfin.com`, and `DASHBOARD_KEY` to the same value as the API's `.env`.
5. In the terminal, `cd ~/pocfin-dashboard`, then `php artisan key:generate`, then `php artisan config:cache`, `php artisan route:cache` and `php artisan view:cache`.
6. Open https://dashboard.pocfin.com and sign in. Check that https://dashboard.pocfin.com/.env is not found (it can't be: only `public/` is on the web).

To update later: build a new zip, upload and extract it over the folder (your `.env` and `storage/` stay), then run step 5's cache commands again (not `key:generate`).
