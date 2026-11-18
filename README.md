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
2. In cPanel's File Manager, make the folder `/home/<cpuser>/pocfin-dashboard/` (next to `pocfin-api`, **not** inside `public_html`), upload the zip **into it** and extract it there. The files are at the top of the zip (no folder inside), so `artisan`, `app`, `public` and `vendor` land directly in `pocfin-dashboard/`. Delete the zip afterwards. Check with `ls ~/pocfin-dashboard`.
3. cPanel → Domains: create `dashboard.pocfin.com` with document root `/home/<cpuser>/pocfin-dashboard/public`. Run AutoSSL (SSL/TLS Status) so it has HTTPS.
4. In `pocfin-dashboard/`, copy `.env.example` to `.env` and set `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://dashboard.pocfin.com`, and `DASHBOARD_KEY` to the same value as the API's `.env`.
5. In the terminal, `cd ~/pocfin-dashboard`, then `php artisan key:generate`, then `php artisan config:cache`, `php artisan route:cache` and `php artisan view:cache`.
6. Open https://dashboard.pocfin.com and sign in. Check that https://dashboard.pocfin.com/.env is not found (it can't be: only `public/` is on the web).

To update later: build a new zip, upload it into `/home/<cpuser>/pocfin-dashboard/`, extract it there and let it overwrite the old files (your `.env` and `storage/` stay, as the zip has neither), delete the zip, then run step 5's cache commands again (not `key:generate`).
