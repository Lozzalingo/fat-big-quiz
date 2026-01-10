# Fat Big Quiz - Backup Strategy

## Overview

Automated backups protect against data loss. The system includes:
- **Daily database backups** (kept for 7 days)
- **Weekly database backups** (kept for 4 weeks)
- **Code on GitHub** (full version history)
- **Media on DigitalOcean Spaces** (built-in redundancy)

---

## What's Backed Up

| Data | Backup Method | Retention | Location |
|------|---------------|-----------|----------|
| Database (MySQL) | Automated mysqldump | 7 daily + 4 weekly | `/root/fat-big-quiz/backups/` |
| Code | Git commits | Forever | GitHub |
| Product images | DigitalOcean Spaces | N/A (redundant) | Spaces CDN |
| Download files | DigitalOcean Spaces | N/A (redundant) | Spaces CDN |

---

## Database Backups

### Automatic Daily Backups

A cron job runs every day at **3:00 AM UTC**:

```
0 3 * * * /root/fat-big-quiz/scripts/backup-database.sh >> /root/fat-big-quiz/backups/backup.log 2>&1
```

### Backup Locations

```
/root/fat-big-quiz/backups/
├── daily/
│   ├── fatbigquiz_2026-01-10.sql.gz
│   ├── fatbigquiz_2026-01-09.sql.gz
│   └── ... (last 7 days)
├── weekly/
│   ├── fatbigquiz_week_2026-01-05.sql.gz
│   └── ... (last 4 weeks)
└── backup.log
```

### Manual Backup

Run a backup manually anytime:

```bash
ssh root@157.245.42.21
/root/fat-big-quiz/scripts/backup-database.sh
```

### View Backup Log

```bash
ssh root@157.245.42.21 "tail -50 /root/fat-big-quiz/backups/backup.log"
```

---

## Restoring from Backup

### 1. List Available Backups

```bash
ssh root@157.245.42.21 "ls -lh /root/fat-big-quiz/backups/daily/"
```

### 2. Restore Database

```bash
# SSH into server
ssh root@157.245.42.21

# Decompress and restore (replace date with your backup)
gunzip -c /root/fat-big-quiz/backups/daily/fatbigquiz_2026-01-10.sql.gz | \
  docker exec -i fatbigquiz_db mysql -uroot -p'mysql_root_secure_2024' fatbigquiz
```

### 3. Verify Restoration

```bash
docker exec fatbigquiz_db mysql -uroot -p'mysql_root_secure_2024' fatbigquiz -e "SELECT COUNT(*) FROM Product;"
```

---

## Code Backups (GitHub)

### Always Commit Before Deploying

```bash
git add -A
git commit -m "Description of changes"
git push origin main
```

### Rollback Code

```bash
# View recent commits
git log --oneline -10

# Revert to a specific commit
git checkout <commit-hash> -- .

# Or reset completely (destructive)
git reset --hard <commit-hash>
```

---

## Media Files (DigitalOcean Spaces)

Product images and download files are stored on DigitalOcean Spaces, which has:
- Built-in redundancy (3x replication)
- 99.99% availability SLA
- No additional backup needed

**CDN Endpoint:** `https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com/fat-big-quiz/`

---

## Monitoring

### Check Last Backup

```bash
ssh root@157.245.42.21 "ls -lt /root/fat-big-quiz/backups/daily/ | head -5"
```

### Check Cron is Running

```bash
ssh root@157.245.42.21 "crontab -l | grep backup"
```

### Check Backup Sizes

```bash
ssh root@157.245.42.21 "du -sh /root/fat-big-quiz/backups/*"
```

---

## Disaster Recovery

### Complete System Failure

1. **Spin up new DigitalOcean droplet**
2. **Clone code from GitHub:**
   ```bash
   git clone https://github.com/Lozzalingo/fat-big-quiz.git
   ```
3. **Copy .env file** (store securely offline!)
4. **Start containers:**
   ```bash
   cd fat-big-quiz && docker compose up -d
   ```
5. **Restore database from backup** (see above)

### Recommended: Keep .env Backup

Store a copy of `/root/fat-big-quiz/.env` in a secure location (password manager, encrypted drive).

---

## Future Improvements

Consider:
- [ ] Upload backups to DigitalOcean Spaces (offsite)
- [ ] Enable DigitalOcean Droplet Backups ($4-8/month)
- [ ] Set up backup monitoring alerts
