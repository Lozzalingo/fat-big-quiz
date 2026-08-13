# Fat Big Quiz - Deployment Guide

## Overview

Deployment is fully automated via GitHub Actions. Pushing to `main` triggers a build-and-deploy pipeline that builds Docker images, transfers them to the production server, and restarts containers with health checks and automatic rollback.

## Server Details

- **Server IP:** 157.245.42.21
- **User:** root
- **Project Path:** /root/fat-big-quiz
- **GitHub:** https://github.com/Lozzalingo/fat-big-quiz

## Container Names

- `fatbigquiz_frontend` - Next.js frontend (port 3000)
- `fatbigquiz_api` - Express API (port 3001)
- `fatbigquiz_db` - MySQL database

---

## Automated Deployment (CI/CD)

Every push to `main` triggers `.github/workflows/deploy.yml` which:

1. **Type checks** TypeScript (FBQ source only, shared package errors filtered out)
2. **Lints** with ESLint
3. **Builds** Docker images for frontend and API
4. **Transfers** images to the production server via SCP
5. **Syncs** docker-compose.yml to the server
6. **Restarts** containers with health checks (3 retries)
7. **Runs smoke tests** verifying homepage cards (>=5), event products (>=15), and blog posts
8. **Auto-rolls back** if health checks or smoke tests fail

### Manual and Cache-Clear Deploys

To trigger a deploy without code changes (e.g. to clear the Docker cache):

```bash
gh workflow run deploy.yml -f no_cache=true
```

Or use the GitHub Actions "Run workflow" button in the browser with `no_cache: true`.

**Do not create empty commits** to trigger deploys. Use `workflow_dispatch` instead.

---

## Environment Variables

### Production (.env)

The production `.env` file lives at `/root/fat-big-quiz/.env` on the server. Docker Compose reads it and passes variables to containers via `${VAR}` syntax in `docker-compose.yml`.

**Important:** `NEXT_PUBLIC_*` variables are baked into the Next.js build at image build time via the `environment` block in `docker-compose.yml`. Changing them requires a full rebuild and redeploy.

Key variables:
- `DATABASE_URL` - MySQL connection string
- `DO_SPACES_KEY/SECRET` - DigitalOcean Spaces credentials
- `STRIPE_SECRET_KEY/WEBHOOK_SECRET` - Stripe payment keys
- `NEXTAUTH_SECRET` - NextAuth.js session encryption
- `TICKER_API_KEY` - API key for laurence.computer ticker
- `ADMIN_API_KEY` - Admin endpoint authentication

### NEXT_PUBLIC_API_BASE_URL

**Must be `https://fatbigquiz.com`** (no `/api` suffix). The code already appends `/api/` to all endpoint paths. Setting it to `https://fatbigquiz.com/api` causes all API calls to double-prefix to `/api/api/...` and fail silently.

---

## Nginx Proxy (quiz_app_nginx)

The `quiz_app_nginx` container handles SSL termination and proxying for fatbigquiz.com:

- `/api/` -> Express port 3001
- `/ev/` -> Express port 3001 (events API)
- `/stripe/webhook` -> Express port 3001
- `/socket.io/` -> Express port 3001
- Everything else -> Next.js port 3000

Config source: `/root/quiz-app-python/nginx.conf` on the server (bind-mounted read-only).

**Important:** If the `quiz_app_nginx` container is rebuilt, the `/ev/` proxy rule must be verified. It was added manually and is not part of the quiz-app-python repo.

---

## Database Schema Changes

Prisma migrations are applied during the Docker build. For manual schema changes:

```bash
# Connect to the database
docker exec -it fatbigquiz_db mysql -u root -p fatbigquiz

# Or run a specific migration
docker exec fatbigquiz_api npx prisma migrate deploy
```

---

## Google Service Account Files

These files contain private keys and are NOT in git:

| File | Purpose |
|------|---------|
| `server/config/google-merchant-credentials.json` | Google Merchant Center API |
| `server/config/google-service-account.json` | Google Indexing API |

Upload to server:
```bash
scp your-key.json root@157.245.42.21:/root/fat-big-quiz/server/config/google-service-account.json
```

---

## Checking Logs

```bash
# API logs
docker logs fatbigquiz_api
docker logs -f fatbigquiz_api    # follow in real-time

# Frontend logs
docker logs fatbigquiz_frontend

# All services
docker compose logs --tail 50
```

---

## Smoke Tests

Post-deploy smoke tests run automatically in CI. You can also run them manually:

```bash
./scripts/smoke-test.sh https://fatbigquiz.com
```

This checks all key pages (homepage, events, shop, blog, hire) and API endpoints (homepage cards, event products, blog posts, health check).

---

## Troubleshooting

### API calls returning 404 or HTML
- Check `NEXT_PUBLIC_API_BASE_URL` is `https://fatbigquiz.com` (no `/api` suffix)
- Check Nginx has the correct proxy rules for `/api/` and `/ev/`

### Events page empty
- Verify Nginx has the `/ev/` location block proxying to port 3001
- Test directly: `curl http://localhost:3001/ev/api/products`

### Homepage cards missing
- Verify `/api/homepage-cards/public` is registered before admin middleware in `server/app.js`
- Test directly: `curl http://localhost:3001/api/homepage-cards/public`
