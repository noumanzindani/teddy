# Teddy customer app — Test plan & how to re-run

## Environment (local, all integrations mocked)
- Postgres 16 + Redis via Homebrew (`brew services start postgresql@16 redis`), database `teddy_test`.
- API: `api/.env` (gitignored, mock flags on, rate limits raised) + `api/keys/` (gitignored). Start with `cd api && npm run dev > ../qa/evidence/api.log 2>&1`.
- Reset to the seeded baseline: `qa/reset.sh`.
- iOS dev build (`com.teddybookingllc.teddy`): because of TDY-046 (path with spaces), build from a copy:
  `rsync -a --exclude node_modules --exclude ios User/app/ ~/StudioProjects/teddy-app-ios/ && cd ~/StudioProjects/teddy-app-ios && npm ci && EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo run:ios --device "iPhone 16"`

## Accounts
Seeded (password `Password123!`): client `sophia.carter@example.com`, vendor `emily@skincuress.com`, other vendor `camille@glowup.com`, staff `sarah.mitchell@skincuress.com`, admin `admin@teddy.app`.
Created by tests: `qa.client1@example.com` (through the app's sign-up screen, phone `+15551234567`), `qa.client2@example.com` (API; the "other customer" for access-control tests).

## Suites
| Suite | Command | Covers |
|---|---|---|
| API (116 tests) | `node qa/api/run.mjs` (`--no-reset`, `--only SE`) | auth, profile, discovery, booking, lifecycle (vendor/staff via API), chat + socket, client data, cross-customer security, app↔API contract |
| UI (Maestro) | `qa/maestro/run.sh [flow.yaml]` | U1 sign-up (shows TDY-001), U1b sign-up workaround, U1c onboarding, U2 login, U3 booking (shows TDY-002/004/005/006), U9 drawer logout (shows TDY-029) |

Each API test names where its expected behaviour comes from (docs section, code, contract, or security). A FAIL is a defect; results land in `qa/evidence/api-results.md`.

## Not covered yet
U6 rewards/gift cards, U8 wellness, U10 idle-session (covered indirectly by TDY-007), U11 push tap routing, U12 offline/resilience, real rate-limit test, background jobs with `ENABLE_SCHEDULER/WORKERS=true`.
