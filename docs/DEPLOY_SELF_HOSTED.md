# Deploy Teddy on your own server

Runs the whole backend (API + Postgres + Redis) with Docker Compose, card-free and
persistent. External integrations (Stripe, SMS, email, push) stay mocked, so the demo
works fully without any third-party keys.

## Prerequisites
- A server (any Linux box, VPS, or even your PC) with **Docker + Docker Compose**.
- Git.
- For a shareable HTTPS link: either a **domain** pointed at the server, **or** use the
  built-in **Cloudflare tunnel** (no domain, no open ports).

## 1. Clone and configure
```bash
git clone <your-repo-url> teddy-platform
cd teddy-platform

# Generate JWT keys and print the base64 env lines
cd api
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
cp .env.server.example .env.server
echo "JWT_PRIVATE_KEY_B64=$(base64 -w0 private.pem)" >> .env.server
echo "JWT_PUBLIC_KEY_B64=$(base64 -w0 public.pem)"  >> .env.server
# (open .env.server and remove the duplicate empty JWT_* lines from the template)
cd ..
```

Optionally set a strong DB password:
```bash
export POSTGRES_PASSWORD='choose-a-strong-password'
```

## 2. Start the stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
The API container runs `prisma migrate deploy` on boot, so all migrations apply
automatically. Check it's healthy:
```bash
docker compose -f docker-compose.prod.yml logs -f api      # look for "server listening"
curl http://localhost:4000/health                          # {"status":"ok"}
```

## 3. Load the demo accounts
```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```
Accounts (all password `Password123!`): `admin@teddy.app`, vendors
`priya@skincuress.com` / `camille@glowup.com`, staff `maya.johnson@skincuress.com` /
`emma.r@skincuress.com`, client `sophia.carter@example.com`.

## 4. Get a public HTTPS URL
The front-ends are served over HTTPS (Firebase), so the API must be HTTPS too or browsers
block the calls. Pick one:

**A. You have a domain** — put a reverse proxy in front (Caddy gives automatic HTTPS):
```
# /etc/caddy/Caddyfile
api.yourdomain.com {
    reverse_proxy localhost:4000
}
```
API URL becomes `https://api.yourdomain.com`.

**B. No domain** — use the built-in Cloudflare quick tunnel:
```bash
docker compose -f docker-compose.prod.yml --profile tunnel up -d tunnel
docker compose -f docker-compose.prod.yml logs tunnel     # copy the https://xxxx.trycloudflare.com URL
```
No domain, no port-forwarding, card-free. (The quick-tunnel URL changes on restart; for a
stable URL, create a named Cloudflare tunnel — free, needs a Cloudflare account.)

## 5. Point the front-ends at your API and redeploy
Send me the final API URL from step 4 and I'll rebuild + redeploy the vendor and user apps
to Firebase, then verify the flows. (They currently point at the dead Railway URL.) I'll
also set `CORS_ORIGINS` if your URLs differ from the defaults in `.env.server`.

## Updating later
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build    # rebuilds API, re-applies new migrations
```
