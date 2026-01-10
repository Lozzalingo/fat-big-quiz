# Button Tracking Documentation

This document lists all buttons in the codebase that have `data-track-button` attributes for analytics tracking.

## How It Works

The `VisitorTracker` component (`components/VisitorTracker.tsx`) automatically detects clicks on any element with a `data-track-button` attribute and sends the event to the analytics API.

### Naming Convention

Button names follow the pattern: `[Page/Section]:[Action]`

Examples:
- `Product:Add to Cart`
- `Blog:Post Comment`
- `Admin:Delete Products`

---

## Customer-Facing Pages

| File | Buttons Tracked |
|------|-----------------|
| `AddToCartSingleProductBtn.tsx` | `Product:Add to Cart` |
| `BuyNowSingleProductBtn.tsx` | `Product:Buy Now` |
| `Newsletter.tsx` | `Newsletter:Subscribe` |
| `login/page.tsx` | `Login:Sign In` |
| `register/page.tsx` | `Register:Create Account` |
| `cart/page.tsx` | `Cart:Remove Item`, `Cart:Proceed to Checkout` |
| `checkout/page.tsx` | `Checkout:Pay Now` |
| `Hero.tsx` | `Hero:Buy Now`, `Hero:Learn More` |
| `WishItem.tsx` | `Wishlist:Add to Cart`, `Wishlist:Remove Item` |
| `HeroSection.tsx` | Dynamic `Hero:[cta text]` |
| `Footer.tsx` | `Footer:Browse Quizzes` |
| `HeaderTop.tsx` | `Header:Logout`, `Header:Toggle Mobile Menu`, `Header:Logout Mobile` |
| `MainHeader.tsx` | `MainHeader:Explore Products` |
| `PricingSection.tsx` | `Pricing:Buy Now` |
| `FAQSection.tsx` | `FAQ:Toggle Question` |
| `QuantityInput.tsx` | `Product:Quantity Decrease`, `Product:Quantity Increase` |
| `QuantityInputCart.tsx` | `Cart:Quantity Decrease`, `Cart:Quantity Increase` |
| `Pagination.tsx` | `Shop:Previous Page`, `Shop:Next Page` |
| `SearchInput.tsx` | `Search:Submit` |
| `ShopSearch.tsx` | `Shop:Clear Search` |
| `ProductPageClient.tsx` | `Product:Buy Now`, `Product:Add to Cart`, `Product:Toggle Wishlist` |
| `ProductImageGallery.tsx` | `Product:Select Thumbnail`, `Product:Select Thumbnail Mobile`, `Product:Previous Image`, `Product:Next Image` |
| `ProductItem.tsx` | `Shop:View Product` |
| `CommentsSection.tsx` | `Blog:Post Comment`, `Blog:Cancel Comment`, `Blog:Edit Comment`, `Blog:Delete Comment`, `Blog:Reply Comment`, `Blog:Toggle Replies` |
| `CommentVoting.tsx` | `Blog:Upvote Comment`, `Blog:Downvote Comment` |
| `blog/page.tsx` | `Blog:Search`, `Blog:Filter All`, `Blog:Filter [category]`, `Blog:Retry`, `Blog:Back to Top` |
| `download/[sessionId]/page.tsx` | `Download:Show Files`, `Download:Download File` |
| `purchases/page.tsx` | `Purchases:Retry` |
| `profile/edit/page.tsx` | `Profile:Save Changes` |

---

## Admin Pages

| File | Buttons Tracked |
|------|-----------------|
| `DashboardSidebar.tsx` | `Admin:Toggle Sidebar` |
| `DashboardProductTable.tsx` | `Admin:Delete Products`, `Admin:Duplicate Product` |
| `CustomButton.tsx` | Auto-tracks with `Admin:[text]` (reusable component) |
| `analytics/page.tsx` | `Analytics:Time Range [label]`, `Analytics:Tab [label]` |

---

## Adding New Button Tracking

When adding a new button, include the `data-track-button` attribute:

```tsx
<button
  onClick={handleClick}
  data-track-button="Section:Action Name"
  className="..."
>
  Button Text
</button>
```

For links styled as buttons, the same attribute works:

```tsx
<Link
  href="/path"
  data-track-button="Section:Action Name"
  className="..."
>
  Link Text
</Link>
```

---

## Viewing Analytics

Button click data can be viewed in the Admin Analytics dashboard under the "Interactions" tab at `/admin/analytics`.

---

*Last updated: January 2026*
