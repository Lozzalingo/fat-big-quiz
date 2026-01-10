# Fat Big Quiz - Deployment Guide

## Server Details
- **Server IP:** 157.245.42.21
- **User:** root
- **Project Path:** /root/fat-big-quiz
- **GitHub:** https://github.com/Lozzalingo/fat-big-quiz

## Container Names
- `fatbigquiz-frontend` - Next.js frontend (port 3000)
- `fatbigquiz_api` - Express API (port 3001)
- `fatbigquiz_db` - MySQL database

## Network
- `fat-big-quiz_fatbigquiz_network`

---

## Pre-Deployment: Commit to GitHub

**ALWAYS commit your changes to GitHub before deploying!**

```bash
# 1. Check what's changed
git status

# 2. Stage all changes
git add -A

# 3. Commit with a descriptive message
git commit -m "Description of changes"

# 4. Push to GitHub
git push origin main
```

This ensures:
- Code is backed up
- Changes are tracked with history
- Easy rollback if something breaks
- Team collaboration possible

---

## Rebuilding & Restarting Containers

### Frontend

```bash
# 1. Copy changed files to server
scp /path/to/file root@157.245.42.21:/root/fat-big-quiz/path/to/file

# 2. Rebuild image (use cached build - much faster ~4 seconds vs 3-5 min)
cd /root/fat-big-quiz && docker build -t fatbigquiz-frontend .
# Only use --no-cache if changes aren't being picked up

# 3. Restart container - ALWAYS use --env-file
docker stop fatbigquiz-frontend && docker rm fatbigquiz-frontend
docker run -d \
  --name fatbigquiz-frontend \
  --restart unless-stopped \
  -p 3000:3000 \
  --network fat-big-quiz_fatbigquiz_network \
  --env-file /root/fat-big-quiz/.env \
  fatbigquiz-frontend
```

### API (Backend)

```bash
# 1. Copy changed files to server
scp /path/to/file root@157.245.42.21:/root/fat-big-quiz/server/path/to/file

# 2. Rebuild image (cached build is fast, use --no-cache only if needed)
cd /root/fat-big-quiz/server && docker build -t fatbigquiz_api .

# 3. Restart container - ALWAYS use --env-file
docker stop fatbigquiz_api && docker rm fatbigquiz_api
docker run -d \
  --name fatbigquiz_api \
  --restart unless-stopped \
  -p 3001:3001 \
  --network fat-big-quiz_fatbigquiz_network \
  --env-file /root/fat-big-quiz/.env \
  fatbigquiz_api
```

---

## CRITICAL: Environment Variables

**ALWAYS use `--env-file /root/fat-big-quiz/.env`** when starting containers.

**NEVER manually pass individual `-e` flags** like:
```bash
# DO NOT DO THIS - you will miss variables!
docker run -e DATABASE_URL='...' -e SPACES_KEY='...' ...
```

The `.env` file contains all required variables:
- Database connection (DATABASE_URL)
- DigitalOcean Spaces (DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_CDN_ENDPOINT, DO_SPACES_FOLDER)
- Stripe (STRIPE_SECRET_KEY)
- NextAuth (NEXTAUTH_SECRET, NEXTAUTH_URL)
- And more...

---

## Database Schema Changes

```bash
# 1. Copy updated schema
scp /path/to/schema.prisma root@157.245.42.21:/root/fat-big-quiz/server/prisma/schema.prisma

# 2. Alter column directly if needed (for simple changes)
docker exec fatbigquiz_db mysql -u root -p'mysql_root_secure_2024' fatbigquiz -e "ALTER TABLE ..."

# 3. Rebuild API to regenerate Prisma client
cd /root/fat-big-quiz/server && docker build -t fatbigquiz_api .

# 4. Restart API with --env-file
```

---

## Checking Logs

```bash
# Frontend logs
docker logs fatbigquiz-frontend

# API logs
docker logs fatbigquiz_api

# Follow logs in real-time
docker logs -f fatbigquiz_api
```

---

## Common Issues

### "Region is missing" error on uploads
- **Cause:** API container missing DO_SPACES_REGION env var
- **Fix:** Restart API with `--env-file`

### "NO_SECRET" NextAuth error
- **Cause:** Frontend missing NEXTAUTH_SECRET env var
- **Fix:** Restart frontend with `--env-file`

### Database connection errors
- **Cause:** Wrong DATABASE_URL or container not on correct network
- **Fix:** Ensure `--network fat-big-quiz_fatbigquiz_network` and `--env-file`
