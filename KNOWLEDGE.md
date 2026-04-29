# Fat Big Quiz - Knowledge Document

Last updated: 27/04/2026

## Overview

Fat Big Quiz (fatbigquiz.com) is a full-stack e-commerce platform for selling downloadable quiz packs, hosting live quiz game shows, and managing event bookings. It is part of the Lozzalingo ecosystem alongside BucketRace and Kalluna Events Co.

**What it sells:**
- Downloadable quiz packs (PDF) - pub quizzes, picture rounds, dingbats, music rounds
- Live quiz game show experiences (virtual and in-person)
- Event bookings via calendar system

**Who it is for:**
- Pub quiz hosts buying ready-made quiz packs
- Companies booking team-building quiz events
- Individuals looking for quiz night content

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, DaisyUI |
| Backend | Express.js 5.1 (port 3001) |
| Database | MySQL 8.0 via Prisma ORM |
| Auth | NextAuth (credentials provider, bcrypt) |
| Payments | Stripe Checkout |
| Email | Resend (raw API) |
| Storage/CDN | DigitalOcean Spaces (S3-compatible) |
| Real-time | Socket.io (live quiz gameplay) |
| Deployment | Docker Compose on DigitalOcean droplet |
| Monorepo | npm workspaces with @lozzalingo/* shared packages |

---

## Architecture

```
Browser --> Next.js (port 3000) --> Express API (port 3001) --> MySQL
                |                        |
                |                        +--> DigitalOcean Spaces (CDN)
                |                        +--> Resend (email)
                |                        +--> Stripe (payments)
                |
                +--> NextAuth (sessions)
                +--> Stripe Checkout (client-side redirect)
```

The frontend and backend run as separate Docker containers. Next.js handles pages, auth, and the Stripe checkout/webhook API routes. Express handles all other API endpoints (products, blog, orders, subscribers, analytics, admin).

---

## Directory Structure

```
fat-big-quiz/
├── app/                    # Next.js App Router pages
│   ├── api/                # Next.js API routes (auth, checkout, webhooks)
│   ├── (dashboard)/        # Admin dashboard (protected)
│   ├── blog/               # Blog listing and detail pages
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout flow
│   ├── download/           # Post-purchase download page
│   ├── play/               # Live quiz game interface
│   ├── on-stage/           # Presenter mode for live games
│   ├── products/           # Product listing
│   ├── product/[slug]/     # Product detail page
│   ├── shop/               # Shop catalogue with filters
│   ├── profile/            # User account
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── search/             # Search results
│   ├── wishlist/           # Saved items
│   ├── quiz-database/      # Quiz creation tool
│   ├── sitemap.ts          # Dynamic sitemap
│   └── layout.tsx          # Root layout with providers
├── components/             # 57 React components
│   ├── Header/             # Navigation
│   ├── Blog/               # Blog components
│   ├── Dashboard/          # Admin components
│   └── ...                 # Product, cart, UI components
├── server/                 # Express.js backend
│   ├── app.js              # Main server entry point
│   ├── routes/             # 30+ route files
│   ├── controllers/        # Business logic (30 files)
│   ├── services/           # Email, Google Merchant, crosspost
│   ├── middleware/          # Auth validation, Zod schemas
│   ├── prisma/             # Schema and migrations
│   └── utils/              # Spaces upload, DB helpers
├── lib/                    # Auth config, validation helpers
├── utils/                  # Client-side utilities (CDN, analytics)
├── types/                  # TypeScript type definitions
├── scripts/                # Migration and seed scripts
├── test/                   # Critical path tests (31 cases)
├── public/                 # Static assets
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # 3 services: frontend, api, mysql
└── package.json            # Scripts, dependencies
```

---

## Key Concepts

### Product System

Products support a **parent-variant hierarchy**. A parent product (e.g. "Sports Quiz Pack") can have multiple variants (e.g. "Football Edition", "Cricket Edition"). Each variant has its own price, slug, images, and downloadable files.

- Products stored in `Product` model with optional `parentId`
- Images uploaded to DO Spaces under `fat-big-quiz/products/[slug]/`
- Downloadable files (PDFs) stored in `fat-big-quiz/downloads/`
- Categories are shared between PRODUCT and BLOG types
- Products can be reordered for display via `displayOrder` field

### Purchase and Download Flow

1. Customer adds product to cart (Zustand state)
2. Clicks checkout - hits `POST /api/checkout` (Next.js API route)
3. Stripe Checkout session created with product details
4. Customer redirected to Stripe for payment
5. On success, Stripe sends webhook to `POST /api/webhooks/stripe`
6. Webhook creates `Purchase` record with unique download token
7. Customer redirected to `/download/{SESSION_ID}`
8. Download page calls Express API to stream file from Spaces
9. Download tracked (count, timestamps) in database

### Blog System

216 blog posts migrated from the BucketRace Wix site, plus new FBQ content. Posts support:
- Rich HTML content (React Quill editor in admin)
- Cover images on CDN (converted to WebP, April 2026)
- 8 categories: Sports Quiz, Weekly News Quiz, Picture Quiz, General Knowledge Quiz, Football Quiz, Dingbats Quiz, Music Quiz, Flag Quiz
- Nested comment system with upvote/downvote voting
- Full-text search across title, content, and excerpt
- Tags for cross-cutting topics

### Live Quiz Game Engine

Real-time multiplayer quiz system via Socket.io:
- Host creates a game room from the dashboard
- Players join via `/play` with a room code
- Questions displayed synchronously to all players
- Scoring, leaderboards, and round management in real-time
- Presenter mode (`/on-stage`) for projecting on screen

### Newsletter and Campaigns

- `Subscriber` model stores email signups from popup
- Double opt-in: confirmation email sent on signup
- Anti-spam honeypot field in signup form
- `Campaign` model for admin-created email blasts
- Preview before sending
- Unsubscribe link in all emails

### Visitor Analytics

Comprehensive tracking via `Visitor` model:
- Device, browser, OS detection (ua-parser-js)
- UTM parameter capture
- Referrer tracking
- Page view counts and session duration
- Bot detection
- Admin dashboard for analytics summary

---

## API Endpoints

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List all products |
| GET | /api/products/:id | Get product by ID |
| POST | /api/products | Create product (admin) |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/parents | Get parent products |
| GET | /api/products/parent/:parentId/variants | Get variants |
| POST | /api/products/:id/duplicate | Duplicate with variants |
| PUT | /api/products/reorder | Reorder display |
| GET | /api/slugs/:slug | Get product by slug |
| GET | /api/search | Full-text product search |

### Blog
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/blog | List posts (paginated, filterable) |
| GET | /api/blog/slug/:slug | Get post by slug |
| POST | /api/blog | Create post (admin) |
| PUT | /api/blog/:id | Update post |
| DELETE | /api/blog/:id | Delete post |
| GET | /api/blog/category/:name | Posts by category |

### Comments and Votes
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/comments | Comments for a post |
| POST | /api/comments | Add comment |
| DELETE | /api/comments/:id | Delete comment |
| POST | /api/votes | Vote on comment |

### Users and Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users | List users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |
| POST | /api/shared-auth/forgot-password | Request reset |
| POST | /api/shared-auth/reset-password | Reset password |
| POST | /api/register (Next.js) | User registration |

### Orders and Purchases
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/orders | List orders |
| POST | /api/orders | Create order |
| GET | /api/purchases | Get by email |
| POST | /api/purchases | Create purchase |
| GET | /api/purchases/:id | Purchase details |
| POST | /api/download/:id/:token | Download file |

### Subscribers and Campaigns
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/subscribers | List subscribers |
| POST | /api/subscribers | Subscribe |
| POST | /api/subscribers/unsubscribe | Unsubscribe |
| POST | /api/subscribers/confirm | Confirm email |
| GET | /api/campaigns | List campaigns (admin) |
| POST | /api/campaigns | Create campaign (admin) |
| POST | /api/campaigns/preview | Preview (admin) |

### Discount Codes
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/discount-codes | List active codes |
| POST | /api/discount-codes | Create code (admin) |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/visitors/track | Track page visit |
| POST | /api/visitors/update | Update visitor data |
| GET | /api/visitors/summary | Dashboard (admin) |

### Admin/Ops (require x-admin-key header)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ops/health | Health check |
| GET | /api/ops/detailed | Memory and disk info |
| GET | /api/ops/alerts | System alerts |
| GET | /api/logs | Application logs |
| GET | /api/logs/stats | Log statistics |
| GET | /api/storage/stats | CDN storage stats |
| GET | /api/app-settings | System settings |
| POST | /api/app-settings | Update settings |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/quiz-formats | Quiz format types |
| GET | /api/homepage-cards | Homepage cards |
| GET | /api/wishlist/:userId | User wishlist |
| POST | /api/wishlist | Add to wishlist |
| GET | /api/merchant | Google Merchant feeds |
| GET | /api/indexing | Search engine indexing |

---

## Database Models

### Core E-Commerce
- **Product** - Quiz packs with parent-variant hierarchy, pricing, slugs, downloadable files
- **Purchase** - Purchase records with download tokens, expiry, tracking
- **DiscountCode** - Percentage or fixed discount codes with product targeting
- **Category** - Shared between PRODUCT and BLOG (type field)
- **Customer_order** - Customer order records
- **Image** - Additional product images
- **QuizFormat** - Quiz type definitions (Basic, Music, Picture, etc.)

### Users
- **User** - Accounts with email, hashed password, profile
- **Settings** - Notification preferences
- **PasswordResetToken** - Time-limited reset tokens
- **EmailVerificationToken** - Email confirmation tokens

### Content
- **BlogPost** - Articles with HTML content, cover images, categories
- **Comment** - Nested replies (parentId self-reference)
- **Vote** - Comment voting system
- **Tag** - Blog post tags

### Analytics
- **Visitor** - Full visitor tracking (device, browser, UTM, referrer, behaviour)
- **AppLog** - Server error and event logs

### Events
- **CalendarEvent** - Virtual/in-person events with recurrence
- **CalendarBooking** - Event reservations

### Shared Package Models
- **Subscriber** - Newsletter signups with confirmation
- **Campaign** - Email campaigns
- **HomepageCard** - Configurable homepage sections
- **GlobalDownloadFile** - Bonus files included with all purchases
- **Order/OrderItem** - Multi-tenant order system
- **MerchProduct** - Merchandise inventory
- **Setting** - Encrypted app-level settings

---

## CDN and File Storage

**Provider:** DigitalOcean Spaces (S3-compatible)
**Bucket:** aitshirts-laurence-dot-computer
**CDN URL:** https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com

### Folder Structure
```
fat-big-quiz/
├── products/[slug]/     # Product images and PDFs
├── downloads/           # Downloadable quiz packs
├── blog/                # Blog cover images (WebP)
│   └── content/         # Inline blog images (WebP)
├── categories/          # Category cover images
├── quiz-formats/        # Quiz type images
│   └── explainers/
├── homepage-cards/      # Homepage card images
├── avatars/             # User profile pictures
└── global-bonus/        # Bonus files for all purchases
```

### Image Optimisation (April 2026)
All blog images batch-converted from PNG/JPG to WebP:
- 601 FBQ images: 2,342 MB reduced to ~85 MB (96% reduction)
- Originals preserved on CDN alongside WebP versions
- Database references updated to .webp extensions
- Client utility functions in `utils/cdn.ts`

---

## Email System

**Provider:** Resend (raw fetch API in `server/services/email.js`)

### Templates
1. **Welcome** - Sent on registration, highlights key features
2. **Purchase confirmation** - Download link with expiry
3. **Order confirmation** - Event booking details
4. **Password reset** - Time-limited reset link
5. **Admin sale notification** - Alerts admin of new purchases
6. **Campaign** - Custom admin-authored emails

### Configuration
- From: `no-reply@fatbigquiz.com`
- Reply-to: configurable via `RESEND_REPLY_TO` env var
- Email routing: `info@fatbigquiz.com` forwards to `laurencedotcomputer@gmail.com` (Cloudflare Email Routing)

---

## Payments (Stripe)

### Flow
1. Cart state managed client-side via Zustand
2. `POST /api/checkout` creates Stripe Checkout session
3. Customer redirected to Stripe hosted checkout
4. Webhook (`POST /api/webhooks/stripe`) processes `checkout.session.completed`
5. Purchase record created, confirmation emails sent
6. Customer redirected to download page or order success page

### Important
- Prices always recalculated server-side (never trust client)
- Webhook verifies Stripe signature before processing
- Download tokens are unique per purchase with expiry

---

## Authentication

**Provider:** NextAuth with credentials provider

### Flow
1. User submits email + password on `/login`
2. NextAuth queries MySQL for user record
3. Bcrypt compares password hash
4. Session stored in secure HTTP-only cookie
5. Server-side pages use `getServerSession()` to check auth

### Protection Levels
- **Public** - Products, blog, search
- **Authenticated** - Profile, wishlist, downloads, comments
- **Admin** - Dashboard, CRUD operations (requires `x-admin-key` header)

---

## Deployment

### Infrastructure
- **Server:** DigitalOcean droplet at 157.245.42.21 (dedicated FBQ droplet)
- **SSH:** `ssh -i ~/.ssh/id_ed25519_droplet root@157.245.42.21`
- **DNS:** Cloudflare (fatbigquiz.com)

### Docker Compose Services
1. **frontend** - Next.js standalone (port 3000)
2. **api** - Express.js (port 3001)
3. **db** - MySQL 8.0 (port 3306, internal only)

### Deploy Process
```bash
# On local machine
git push origin main

# SSH into server
ssh -i ~/.ssh/id_ed25519_droplet root@157.245.42.21

# On server
cd /root/fat-big-quiz
git pull
docker image prune -f && docker builder prune -f   # Free memory (2GB RAM)
docker compose up -d --build                         # Rebuild and restart
docker compose exec api npx prisma migrate deploy   # Run pending migrations
```

### Key Notes
- Code is baked into Docker image - must rebuild for changes
- Next.js builds are memory-hungry - stop other containers if OOM
- Check disk before deploying: `df -h /`
- If only one service changed, build only that: `docker compose build frontend`

---

## Shared Packages (@lozzalingo/*)

FBQ uses these shared workspace packages:

| Package | Purpose |
|---------|---------|
| @lozzalingo/analytics | Visitor tracking, device detection, UTM |
| @lozzalingo/auth | Auth routes, password reset, email verification |
| @lozzalingo/config | Centralised app configuration |
| @lozzalingo/email | Email service and templates |
| @lozzalingo/logging | Server and client error logging |
| @lozzalingo/merchandise | Merch product management |
| @lozzalingo/ops | Health checks, system monitoring |
| @lozzalingo/orders | Order management |
| @lozzalingo/settings | Encrypted settings storage |
| @lozzalingo/storage | File upload and CDN management |
| @lozzalingo/subscribers | Newsletter management |
| @lozzalingo/calendar | Event booking system (optional) |
| @lozzalingo/game-engine | Real-time quiz gameplay (optional) |

---

## BucketRace Migration (Complete)

- **216 quiz posts** migrated from Wix BucketRace to FBQ MySQL
- All images moved to DO Spaces CDN (no Wix dependencies)
- Collapsible list content converted to `<details><summary>` HTML
- Redirect map generated: `scripts/wix-migration/output/redirect-map.conf`
- Migration script: `scripts/wix-migration/migrate.js`
- Patch script: `scripts/wix-migration/patch-collapsible.js`

---

## Brand Colours and Styling

- **Primary:** Purple (#673ab7)
- **Font:** Poppins
- **UI Framework:** DaisyUI (on top of Tailwind)
- **Animations:** Shimmer, fade-in, slide-up (custom Tailwind config)

---

## Running Locally

```bash
# Install dependencies (from monorepo root)
npm install

# Frontend (Next.js on port 3000)
cd fat-big-quiz
npm run dev

# Backend (Express on port 3001)
cd fat-big-quiz/server
node app.js

# Database
cd fat-big-quiz/server
npx prisma migrate dev    # Run migrations
npx prisma studio         # GUI browser

# Tests
cd fat-big-quiz
npm test                   # 31 critical path tests
```

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| DATABASE_URL | MySQL connection string |
| NEXTAUTH_SECRET | Session encryption key |
| NEXTAUTH_URL | Auth callback URL |
| NEXT_PUBLIC_API_BASE_URL | Express API URL (client) |
| NEXT_PUBLIC_BASE_URL | Frontend URL |
| STRIPE_SECRET_KEY | Stripe secret key |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |
| DO_SPACES_KEY | DigitalOcean Spaces access key |
| DO_SPACES_SECRET | DigitalOcean Spaces secret |
| DO_SPACES_REGION | Spaces region (sfo3) |
| DO_SPACES_BUCKET | Spaces bucket name |
| DO_SPACES_FOLDER | Spaces folder prefix (fat-big-quiz) |
| NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT | CDN URL for client |
| NEXT_PUBLIC_DO_SPACES_FOLDER | CDN folder for client |
| RESEND_API_KEY | Resend email API key |
| RESEND_REPLY_TO | Reply-to email address |
| ADMIN_API_KEY | Admin API authentication key |

### Optional
| Variable | Description |
|----------|-------------|
| YOUTUBE_API_KEY | YouTube data API key |
| OPENAI_API_KEY | OpenAI API key (content generation) |
| YOUTUBE_CLIENT_ID | YouTube OAuth client |
| GOOGLE_APPLICATION_CREDENTIALS | Google Merchant credentials path |

---

## Testing

**Test file:** `test/critical-path.test.js` (Node.js built-in test runner)

**31 test cases covering:**
- Health checks and ops endpoints
- Product CRUD and listing
- User creation and duplicate rejection
- Subscriber validation and management
- Auth and rate limiting (forgot-password)
- Purchase and order lifecycle
- Blog system CRUD
- Campaign management (admin-protected)
- Logs and storage (admin-protected)
- Visitor analytics and bot detection

**Run:** `npm test`

---

## Security Measures

- Bcrypt password hashing with salt rounds
- NextAuth secure HTTP-only session cookies
- Stripe webhook signature verification
- Admin routes protected by `x-admin-key` header
- Zod schema validation at API boundary
- CORS configured for credentials
- Rate limiting on auth endpoints
- Bot detection in analytics
- Prices recalculated server-side (never trust client)
- sanitize-html for user-generated HTML content
- Non-root Docker user (nextjs)
