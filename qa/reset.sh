#!/usr/bin/env bash
# Reset the local QA backend to the seeded baseline: fresh DB, migrations, seed, empty Redis.
# Usage: qa/reset.sh   (the API dev server can stay running)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG=/opt/homebrew/opt/postgresql@16/bin

"$PG/dropdb" --if-exists --force teddy_test
"$PG/createdb" teddy_test
/opt/homebrew/opt/redis/bin/redis-cli flushall >/dev/null

cd "$ROOT/api"
npx prisma migrate deploy >/dev/null
npm run --silent db:seed >/dev/null
echo "QA backend reset: teddy_test migrated + seeded, Redis flushed."
