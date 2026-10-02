# Teddy

Beauty & wellness booking platform — API + client apps for users, vendors (salon owners),
and staff.

| Component | Stack | Location |
|---|---|---|
| API | Node + Express + Prisma (Postgres) + Redis + Socket.IO | `api/` |
| User app | React Native / Expo | `User/app/` |
| Vendor panel | Next.js | `Vendor/app/` |
| Employee portal | Next.js | `Employer/app/` |

## Deployment

Self-host the whole backend (API + Postgres + Redis) with one Docker Compose command —
card-free and persistent.

```bash
git clone <your-repo-url> teddy-platform
cd teddy-platform
# follow the guide:
```

📖 **[docs/DEPLOY_SELF_HOSTED.md](docs/DEPLOY_SELF_HOSTED.md)** — full step-by-step
(clone → JWT keys → `docker compose up` → seed demo accounts → public HTTPS link → point
the front-ends at the API).

Quick start once configured:
```bash
docker compose -f docker-compose.prod.yml up -d --build                      # Postgres + Redis + API
docker compose -f docker-compose.prod.yml --profile seed run --rm seed        # demo accounts (pw: Password123!)
docker compose -f docker-compose.prod.yml --profile tunnel up -d tunnel       # public HTTPS URL (no domain)
curl http://localhost:4000/health                                             # {"status":"ok"}
```

Demo accounts: `admin@teddy.app`, vendors `priya@skincuress.com` / `camille@glowup.com`,
staff `maya.johnson@skincuress.com` / `emma.r@skincuress.com`, client
`sophia.carter@example.com` — all password `Password123!`.
