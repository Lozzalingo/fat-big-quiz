# Fat Big Quiz - Claude Guidelines

Shared JS framework rules are in the parent `Lozzalingo-JS/CLAUDE.md`.

## Project
- **Domain:** fatbigquiz.com
- **Stack:** Next.js 14 + Express + Prisma + MySQL
- **Server:** DigitalOcean droplet 157.245.42.21 (dedicated FBQ droplet)
- **CDN:** DigitalOcean Spaces (`fat-big-quiz/` folder in `aitshirts-laurence-dot-computer` bucket)

## Architecture
- Frontend: Next.js 14 App Router (TypeScript, Tailwind, DaisyUI)
- Backend: Express server in `server/` (port 3001)
- Database: MySQL (`fat_big_quiz`) via Prisma ORM
- Image storage: DO Spaces with CDN (`server/utils/spaces.js`)

## Key Directories
- `app/` — Next.js pages and components
- `server/` — Express API, Prisma schema, controllers
- `server/prisma/schema.prisma` — Database schema (source of truth)
- `server/controllers/` — API business logic
- `server/routes/` — Express route definitions
- `server/utils/spaces.js` — DO Spaces upload/download utilities
- `utils/cdn.ts` — Frontend CDN URL helpers
- `scripts/wix-migration/` — BucketRace Wix migration tools

## BucketRace Migration (COMPLETE)
- **216 quiz posts** migrated from Wix BucketRace → FBQ MySQL
- **8 categories:** Sports Quiz, Weekly News Quiz, Picture Quiz, General Knowledge Quiz, Football Quiz, Dingbats Quiz, Music Quiz, Flag Quiz
- All images (cover + inline) on DO Spaces CDN — no Wix dependencies
- COLLAPSIBLE_LIST content patched to `<details><summary>` HTML
- Redirect map: `scripts/wix-migration/output/redirect-map.conf` (216 rules)
- Migration script: `scripts/wix-migration/migrate.js`
- Patch script: `scripts/wix-migration/patch-collapsible.js`

## Brand Strategy
FBQ is one of three brands:
1. **Fat Big Quiz** (this site) — quizzes, game shows, whacky wagers
2. **BucketRace** — scavenger hunts only (separate Lozzalingo-JS site)
3. **Kalluna Events Co.** — bespoke events marketplace (AI-powered, future build)

## Blog System
- Model: `BlogPost` with `Category` (type=BLOG), `Tag`, `Comment`
- API: `POST /api/blog` to create, `GET /api/blog/slug/:slug` to read
- Frontend: `/blog` (list) and `/blog/[blogSlug]` (detail page)
- Cover images stored as filename in DB, served from DO Spaces CDN
- Categories are shared between PRODUCT and BLOG (use `type` field)

## Running Locally
```bash
# Frontend (Next.js)
npm run dev          # port 3000

# Backend (Express)
cd server && node app.js  # port 3001

# Database
cd server && npx prisma migrate dev    # run migrations
cd server && npx prisma studio         # GUI browser
```
