# BucketRace → Fat Big Quiz Migration Checklist

**Source:** Wix BucketRace site (bucketrace.com)
**Destination:** Fat Big Quiz (fatbigquiz.com) — Lozzalingo-JS / Next.js + Express + Prisma + MySQL
**What moved:** 216 quiz blog posts (out of 337 total) + cover images + inline images + SEO redirects

---

## Phase 1: Migrate Quiz Blog Posts — COMPLETE

- [x] MySQL running locally with `fat_big_quiz` database
- [x] Prisma client generated
- [x] `.env` configured in `server/` with DB + DO Spaces credentials
- [x] Dry-run confirmed 216 quiz posts across 8 categories
- [x] Test migration (1 post) verified locally
- [x] Full migration: 216/216 posts, 0 failures
- [x] All cover images + inline images uploaded to DO Spaces CDN
- [x] COLLAPSIBLE_LIST nodes patched to `<details><summary>` HTML (19 posts)
- [x] 8 consolidated categories: Sports Quiz (62), Weekly News Quiz (58), Picture Quiz (31), General Knowledge Quiz (28), Football Quiz (15), Dingbats Quiz (13), Music Quiz (8), Flag Quiz (1)
- [x] Redirect map generated: `output/redirect-map.conf` (216 rules)
- [x] Blog post page fixed to use `/api/blog/slug/:slug` endpoint
- [x] SocialShare component added to blog posts

---

## Phase 2: Build New BucketRace Site (Lozzalingo-JS)

- [ ] Create `bucketrace/` in Lozzalingo-JS workspace
- [ ] Scavenger hunts focus — public + private events
- [ ] Import non-quiz content from Wix (~77 posts: Articles, Stag Do, Scavenger Hunts)
- [ ] Set up bucketrace.com domain config

---

## Phase 3: DNS + Redirects

### Redirect Setup
- [ ] Deploy `output/redirect-map.conf` to BucketRace nginx config
- [ ] Quiz URLs: `/post/<slug>` → 301 → `https://fatbigquiz.com/blog/<slug>`
- [ ] Non-quiz URLs: `/post/<slug>` → 301 → `https://bucketrace.com/blog/<slug>`

### DNS Migration
- [ ] Log into 123-Reg (bucketrace.com registrar)
- [ ] Change nameservers from Wix (ns12/ns13.wixdns.net) → Cloudflare or DigitalOcean
- [ ] Set up A record pointing to DigitalOcean droplet
- [ ] SSL certificate via Let's Encrypt (certbot)
- [ ] Verify bucketrace.com loads from new server

### SEO Verification
- [ ] Google Search Console — add bucketrace.com property
- [ ] Submit updated sitemap
- [ ] Monitor 301 redirect indexing
- [ ] Check fatbigquiz.com for incoming redirected traffic

---

## Quick Reference

```bash
# All commands run from: fat-big-quiz/

# Dry run (preview, no writes)
node scripts/wix-migration/migrate.js --dry-run

# Test with 1 post
node scripts/wix-migration/migrate.js --limit 1

# Test with 5 posts (no image uploads)
node scripts/wix-migration/migrate.js --limit 5 --skip-images

# Full migration
node scripts/wix-migration/migrate.js

# Check outputs
cat scripts/wix-migration/output/redirect-map.conf
cat scripts/wix-migration/output/migration-report.json
```

## Files

| File | Purpose |
|------|---------|
| `scripts/wix-migration/migrate.js` | Main migration script |
| `scripts/wix-migration/MIGRATION.md` | This checklist |
| `scripts/wix-migration/output/redirect-map.conf` | nginx 301 redirect rules (generated) |
| `scripts/wix-migration/output/migration-report.json` | Full migration report (generated) |

## Wix API Details
- **API Key:** Stored in `migrate.js` (account-level, read-only)
- **Site ID:** `dccd578c-7e56-4ae6-8056-8f526e672ff8`
- **Endpoint:** `https://www.wixapis.com/blog/v3/posts/query`
- **Total posts:** 337 (212 quiz, 125 non-quiz)
- **Quiz categories:** 12 categories moving to FBQ
