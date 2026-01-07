# Fat Big Quiz - Product Roadmap & Implementation Plan

## Overview

Transform the fat-big-quiz e-commerce site into a complete Fat Big Quiz marketplace with multiple product offerings, Stripe payments, and digital file downloads.

---

## Product Offerings

| # | Product | Type | Price | Priority |
|---|---------|------|-------|----------|
| 1 | **Fat Big Quiz On Stage** | Event/Experience | Variable | High |
| 2 | **Free Quiz Questions** | Blog (Lead Magnet) | Free | Done |
| 3 | **Weekly Pub Quiz Pack** | Subscription | £4.99/mo | High |
| 4 | **One-Off Quiz Downloads** | Digital Products | Variable | High |
| 5 | **Quiz Questions Database** | Premium Subscription | TBD | Medium |
| 6 | **Quiz App** | SaaS | TBD | Medium |

---

## Phase 1: Core Infrastructure

### 1.1 Stripe Integration
- [ ] Set up Stripe account and API keys
- [ ] Install Stripe SDK (`@stripe/stripe-js`, `stripe`)
- [ ] Create payment API routes
- [ ] Implement checkout flow
- [ ] Handle webhooks for payment confirmation
- [ ] Set up subscription billing for recurring products

### 1.2 Digital Download System
- [ ] Create secure download links (signed URLs or tokens)
- [ ] Store downloadable files securely (not in public folder)
- [ ] Create download API endpoint with authentication
- [ ] Track download history per user
- [ ] Email delivery of download links post-purchase
- [ ] Implement download limits (if needed)

### 1.3 Database Updates
```prisma
model Product {
  // ... existing fields
  productType     ProductType @default(PHYSICAL)
  downloadFile    String?     // Path to downloadable file
  downloadLimit   Int?        // Max downloads allowed
  subscriptionId  String?     // Stripe subscription product ID
}

model Purchase {
  id            String   @id @default(cuid())
  userId        String
  productId     String
  stripePaymentId String
  downloadCount Int      @default(0)
  createdAt     DateTime @default(now())
  expiresAt     DateTime?
}

enum ProductType {
  PHYSICAL
  DIGITAL_DOWNLOAD
  SUBSCRIPTION
  EVENT
}
```

---

## Phase 2: Landing Pages

### 2.1 Homepage Redesign
Transform homepage into a product showcase hub:

```
┌─────────────────────────────────────────────────┐
│  HERO: "The Ultimate Pub Quiz Experience"       │
│  [Video Embed] + CTA Buttons                    │
├─────────────────────────────────────────────────┤
│  PRODUCT CARDS (6 products)                     │
│  ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ On  │ │Weekly│ │ DB  │                       │
│  │Stage│ │ Pack │ │ Sub │                       │
│  └─────┘ └─────┘ └─────┘                       │
│  ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │Down-│ │ App │ │Free │                       │
│  │loads│ │     │ │Blog │                       │
│  └─────┘ └─────┘ └─────┘                       │
├─────────────────────────────────────────────────┤
│  TESTIMONIALS / SOCIAL PROOF                    │
├─────────────────────────────────────────────────┤
│  FAQ SECTION                                    │
├─────────────────────────────────────────────────┤
│  FOOTER                                         │
└─────────────────────────────────────────────────┘
```

### 2.2 Product Landing Pages

Each product page (`/product/[slug]`) acts as its own landing page with:

1. **Hero Section**
   - Product title & tagline
   - Hero image/video
   - Price & CTA button

2. **Features Section**
   - What's included
   - Benefits list
   - Screenshots/previews

3. **Social Proof**
   - Testimonials
   - Star ratings
   - "X people bought this"

4. **Pricing Section**
   - Clear pricing
   - What you get
   - Money-back guarantee

5. **FAQ Section**
   - Product-specific FAQs

6. **Related Products**
   - Upsells & cross-sells

### 2.3 Dedicated Landing Pages

| Route | Product | Key Elements |
|-------|---------|--------------|
| `/on-stage` | Fat Big Quiz On Stage | Video embed, booking form, event calendar |
| `/weekly-pack` | Weekly Subscription | Sample questions, subscription benefits |
| `/quiz-database` | Quiz DB Subscription | Search preview, category breakdown |
| `/app` | Quiz App | Feature tour, pricing tiers, demo |

---

## Phase 3: Product Pages Enhancement

### 3.1 Product Page Template
```tsx
// Structure for each product landing page
<ProductLandingPage>
  <HeroSection video={} title={} subtitle={} cta={} />
  <FeaturesGrid features={[]} />
  <TestimonialsCarousel testimonials={[]} />
  <PricingSection price={} includes={[]} />
  <FAQAccordion faqs={[]} />
  <RelatedProducts products={[]} />
</ProductLandingPage>
```

### 3.2 Download Product Flow
```
1. User browses /shop
2. Clicks on digital product
3. Views product landing page
4. Clicks "Buy Now" (£X.XX)
5. Stripe Checkout opens
6. Payment processed
7. Redirect to /download/[purchaseId]
8. User downloads file
9. Email sent with download link
```

### 3.3 Subscription Flow
```
1. User views subscription product
2. Clicks "Subscribe"
3. Stripe Checkout (subscription mode)
4. Payment processed
5. Account upgraded
6. Access to subscriber content
7. Monthly billing via Stripe
```

---

## Phase 4: Marketing & Conversion

### 4.1 Email Capture
- [ ] Newsletter signup in footer
- [ ] Exit-intent popup
- [ ] Free download lead magnet
- [ ] Post-purchase email sequence

### 4.2 Conversion Optimization
- [ ] Add urgency (limited time offers)
- [ ] Social proof badges
- [ ] Trust signals (secure payment, guarantees)
- [ ] Clear value propositions
- [ ] A/B test CTAs

### 4.3 SEO
- [ ] Meta tags for all pages
- [ ] Blog posts targeting quiz keywords
- [ ] Schema markup for products
- [ ] Sitemap generation

---

## Technical Requirements

### Dependencies to Add
```json
{
  "@stripe/stripe-js": "^2.x",
  "stripe": "^14.x",
  "nodemailer": "^6.x" // for email delivery
}
```

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
DOWNLOAD_SECRET=random_secret_for_signing_urls
```

### API Routes Needed
```
POST /api/checkout/create-session
POST /api/webhooks/stripe
GET  /api/download/[purchaseId]
POST /api/subscriptions/create
POST /api/subscriptions/cancel
GET  /api/subscriptions/status
```

---

## Content Needed

### Images Required
- [ ] Fat Big Quiz On Stage promotional images
- [ ] Weekly Pack preview/mockup
- [ ] Quiz Database screenshots
- [ ] App screenshots
- [ ] Testimonial author photos
- [ ] Product thumbnails for shop

### Copy Required
- [ ] Homepage hero copy
- [ ] Product descriptions (6 products)
- [ ] Feature lists for each product
- [ ] FAQ content
- [ ] Email templates (purchase confirmation, download link)
- [ ] Testimonials (real or placeholder)

### Video
- [ ] YouTube embed: https://www.youtube.com/watch?v=MyE37NjmUXE

---

## Implementation Order

### Week 1: Infrastructure
1. Stripe integration
2. Digital download system
3. Database schema updates

### Week 2: Landing Pages
4. Homepage redesign with all products
5. Product page template enhancement
6. Individual landing pages

### Week 3: Polish & Launch
7. Email notifications
8. Testing & bug fixes
9. SEO optimization
10. Launch

---

## File Structure

```
app/
├── page.tsx                    # Homepage (product hub)
├── shop/
│   └── page.tsx               # All products grid
├── product/
│   └── [slug]/
│       └── page.tsx           # Product landing page
├── on-stage/
│   └── page.tsx               # Fat Big Quiz On Stage
├── weekly-pack/
│   └── page.tsx               # Subscription landing
├── quiz-database/
│   └── page.tsx               # DB subscription landing
├── download/
│   └── [purchaseId]/
│       └── page.tsx           # Download page
├── api/
│   ├── checkout/
│   │   └── create-session/
│   │       └── route.ts
│   ├── webhooks/
│   │   └── stripe/
│   │       └── route.ts
│   └── download/
│       └── [purchaseId]/
│           └── route.ts
components/
├── landing/
│   ├── HeroSection.tsx
│   ├── FeaturesGrid.tsx
│   ├── TestimonialsCarousel.tsx
│   ├── PricingSection.tsx
│   ├── FAQAccordion.tsx
│   └── ProductShowcase.tsx
```

---

## Notes

- Fat Big Quiz On Stage source: https://www.bucketrace.com/game-catalouge/the-fat-big-quiz-on-stage
- YouTube video: https://www.youtube.com/watch?v=MyE37NjmUXE
- Quiz App: https://app.fatbigquiz.com
- Need to manually download images from bucketrace site (Wix loads dynamically)
