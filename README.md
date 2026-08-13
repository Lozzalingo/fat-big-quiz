# Fat Big Quiz

Live events, digital downloads, weekly quiz packs, and a free quiz app. Everything you need for amazing quiz nights.

## Stack

- **Frontend:** Next.js 14 (App Router, TypeScript, Tailwind, DaisyUI)
- **Backend:** Express.js (port 3001)
- **Database:** MySQL via Prisma ORM
- **Image Storage:** DigitalOcean Spaces CDN
- **Hosting:** DigitalOcean droplet, Docker Compose
- **CI/CD:** GitHub Actions (push to main triggers build and deploy)

## Local Development

```bash
# Frontend (Next.js on port 3000)
npm install
npm run dev

# Backend (Express on port 3001)
cd server
npm install
node app.js

# Database
cd server
npx prisma migrate dev    # run migrations
npx prisma studio         # GUI browser
```

## Deployment

Push to `main` triggers the GitHub Actions workflow which:

1. Runs type checking and linting
2. Builds Docker images (frontend + API)
3. Transfers images to the production server
4. Restarts containers with health checks
5. Runs post-deploy smoke tests
6. Auto-rolls back if health checks fail

To trigger a cache-clear deploy without code changes:

```bash
gh workflow run deploy.yml -f no_cache=true
```

See `docs/DEPLOYMENT.md` for full details.

## Project Structure

```
app/              Next.js pages and components
components/       Shared React components
server/           Express API, Prisma schema, controllers
server/prisma/    Database schema (source of truth)
server/controllers/ API business logic
server/routes/    Express route definitions
server/utils/     Shared utilities (prisma, spaces, pagination)
scripts/          Migration and maintenance scripts
utils/            Frontend utilities (cdn, api, date formatting)
hooks/            Shared React hooks
```

## Key URLs

- **Production:** https://fatbigquiz.com
- **Quiz App:** https://app.fatbigquiz.com
- **Events:** https://fatbigquiz.com/events
- **Shop:** https://fatbigquiz.com/shop
- **Blog:** https://fatbigquiz.com/blog
