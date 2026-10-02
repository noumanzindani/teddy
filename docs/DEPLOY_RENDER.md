# Deploying Teddy to Render (client demo)

Railway's trial expired, so the API is moving to **Render** (free tier). Postgres and
Redis are Render-managed and auto-wire via `render.yaml`. The front-ends stay on
Firebase Hosting. Everything external (Stripe, email, SMS, push) stays mocked, so the
demo works end-to-end with no real payment/comms integrations.

## Architecture

| Piece | Host | URL |
|---|---|---|
| API (Express + Socket.IO) | Render (Docker) | `https://teddy-api.onrender.com` (assigned on deploy) |
| Postgres | Render managed | internal (auto-wired) |
| Redis / Key Value | Render managed | internal (auto-wired) |
| Vendor panel | Firebase `teddy-vendor-app` | https://teddy-vendor-app.web.app |
| User app (web) | Firebase `teddy-user-app` | https://teddy-user-app.web.app |
| Employee portal | Vercel (to set up) | TBD |

## Steps

### 1. Create the Render Blueprint
1. Push `render.yaml` to `master` (done in this branch).
2. Render dashboard → **New → Blueprint** → connect the `teddy-platform` repo.
3. Render reads `render.yaml` and provisions **teddy-api** + **teddy-db** (Postgres) +
   **teddy-redis** (Key Value). `DATABASE_URL` and `REDIS_URL` wire automatically.

### 2. Set the two JWT secrets
In Render → **teddy-api → Environment**, add the two values from
`api/keys/render-env.local.txt` (gitignored, on your machine):
- `JWT_PRIVATE_KEY_B64`
- `JWT_PUBLIC_KEY_B64`

Then trigger a deploy. The container runs `prisma migrate deploy` on start, so all three
migrations apply automatically.

### 3. Seed the demo accounts
The production image omits dev deps (no `ts-node`), so seed from your machine against the
DB's **External Connection String** (Render → teddy-db → Connect → External):

```bash
cd api
DATABASE_URL="<render-external-postgres-url>" npm run seed
```

Demo accounts (all password `Password123!`):
| Role | Email |
|---|---|
| Admin | admin@teddy.app |
| Vendor | priya@skincuress.com |
| Vendor | camille@glowup.com |
| Staff | maya.johnson@skincuress.com |
| Staff | emma.r@skincuress.com |
| Client | sophia.carter@example.com |

### 4. Repoint the front-ends at the new API URL
Once Render assigns the API URL, rebuild + redeploy the front-ends:

```bash
# Vendor panel
cd Vendor/app
NEXT_PUBLIC_API_URL="https://teddy-api.onrender.com" npm run build   # static export -> out/
firebase deploy --only hosting:teddy-vendor-app

# User web app (also update the hardcoded URL in src/utils/api.ts)
cd User/app
npm run build:web    # or expo export -p web -> dist/
firebase deploy --only hosting:teddy-user-app
```

Then set `CORS_ORIGINS` on Render to the exact Firebase origins (already defaulted in
`render.yaml`).

### 5. (Optional) Employee portal on Vercel
The staff portal (`Employer/app`) isn't hosted. It's a normal Next.js app:
1. Vercel → New Project → import repo → root `Employer/app`.
2. Set `NEXT_PUBLIC_API_URL=https://teddy-api.onrender.com`.
3. Deploy → add the Vercel URL to `CORS_ORIGINS` on Render.

## Notes
- **Free-tier cold start:** Render's free web service sleeps after ~15 min idle (~50s first
  hit). For a client demo, either hit it once to warm it up beforehand, add a keep-alive
  ping, or use the $7 Starter plan for always-on.
- **Free Postgres** expires after 30 days on Render — fine for a demo, plan a migration for
  anything longer-lived.
