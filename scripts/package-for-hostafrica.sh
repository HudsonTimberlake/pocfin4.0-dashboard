#!/usr/bin/env bash
# Builds ONE ready-to-upload zip, deploy-out/pocfin-dashboard.zip: the whole Laravel app with its
# production PHP packages and built CSS/JS, but no .env, tests or node_modules.
# On HostAfrica it goes in its own folder next to the API (e.g. /home/<cpuser>/pocfin-dashboard),
# and the dashboard.pocfin.com subdomain's document root points at its public/ folder.
# Run it on your Mac from the project folder:  bash scripts/package-for-hostafrica.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=deploy-out/pocfin-dashboard
rm -rf deploy-out
mkdir -p "$OUT"

echo "1/4 Building the CSS and JavaScript"
npm run build >/dev/null

echo "2/4 Copying the app (no secrets, tests or node_modules)"
rsync -a \
  --exclude='/.git' --exclude='/node_modules' --exclude='/vendor' --exclude='/tests' --exclude='/deploy-out' \
  --exclude='/scripts' --exclude='/.claude' --exclude='/.env' --exclude='/.phpunit*' --exclude='/public/hot' \
  --exclude='.DS_Store' --exclude='/storage/logs/*' --exclude='/storage/framework/*/*' --exclude='/bootstrap/cache/*.php' \
  ./ "$OUT/"
# cPanel's File Manager drops empty folders when it extracts a zip, so each one gets a small file.
for dir in storage/logs storage/framework/cache/data storage/framework/sessions storage/framework/views storage/app bootstrap/cache; do
  mkdir -p "$OUT/$dir"
  printf '*\n!.gitignore\n' > "$OUT/$dir/.gitignore"
done

echo "3/4 Installing the PHP packages (production only)"
(cd "$OUT" && composer install --no-dev --optimize-autoloader --no-interaction --no-progress >/dev/null)

echo "4/4 Zipping"
(cd deploy-out && zip -qrX pocfin-dashboard.zip pocfin-dashboard -x '*.DS_Store')

echo
ls -lh deploy-out/pocfin-dashboard.zip | awk '{print $5, $9}'
echo "Done. Steps are in README.md."
