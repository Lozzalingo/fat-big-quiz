# Google Merchant Center Integration

Complete guide for managing Google Shopping product listings via the Merchant Center API.

## Overview

Fat Big Quiz products are synced to Google Merchant Center for display in Google Shopping. This integration supports:

- **57 countries** with automatic currency conversion from GBP
- **South Korea** with native KRW pricing (requires separate data source)
- Automatic sync on product create/update/delete
- Manual bulk sync and management via admin panel

## Architecture

### Two Data Sources

Google Merchant Center requires separate data sources for different currency regions:

| Data Source | Feed Label | Currency | Countries |
|-------------|------------|----------|-----------|
| Primary (Quiz Downloads) | `FATBIGQUIZ-DOWNLOADS` | GBP | 57 countries (auto-converts to local currencies) |
| South Korea | `KR` | KRW | South Korea only |

### Why Two Data Sources?

- Google requires all prices in a product to use the same currency
- Most countries accept GBP with automatic currency conversion
- South Korea does NOT support GBP auto-conversion - requires native KRW pricing
- Each product is uploaded twice: once with GBP, once with KRW (offerId + "-KR" suffix)

## API Endpoints

All endpoints are under `/api/merchant/`:

### Status & Info
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Check API configuration and connection status |
| `/products` | GET | List all products in Merchant Center |
| `/product/:id/status` | GET | Get approval status for a specific product |
| `/feed` | GET | Generate JSON feed preview (for debugging) |

### Sync Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync` | POST | Sync ALL products from database to Merchant Center |
| `/sync/:productId` | POST | Sync a single product |

### Delete Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/product/:productId` | DELETE | Remove a single product |
| `/all-products` | DELETE | Remove ALL products (uses REST API) |
| `/kr-products` | DELETE | Remove only KR variant products |
| `/data-sources` | DELETE | Delete data sources (nuclear option - removes everything) |

## Configuration

### Required Environment Variables

```bash
# Google Merchant Center Account ID
GOOGLE_MERCHANT_ID=5708205694

# Path to service account JSON key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-service-account.json
```

### Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a service account or use existing one
3. Grant it the "Merchant Center Admin" role
4. Download the JSON key file
5. Place it on the server and set the path in `GOOGLE_APPLICATION_CREDENTIALS`

## Target Markets (57 Countries)

### English-Speaking
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| GB (UK) | GBP | US | USD |
| CA | CAD | AU | AUD |
| NZ | NZD | IE | EUR |
| ZA | ZAR | SG | SGD |
| HK | HKD | PH | PHP |
| MY | MYR | IN | INR |

### Europe (Eurozone)
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| DE | EUR | FR | EUR |
| IT | EUR | ES | EUR |
| NL | EUR | BE | EUR |
| AT | EUR | PT | EUR |
| FI | EUR | GR | EUR |
| SK | EUR | SI | EUR |
| EE | EUR | LV | EUR |
| LT | EUR | LU | EUR |
| MT | EUR | CY | EUR |
| HR | EUR | | |

### Europe (Non-Euro)
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| SE | SEK | DK | DKK |
| NO | NOK | PL | PLN |
| CZ | CZK | HU | HUF |
| RO | RON | BG | BGN |
| CH | CHF | | |

### Americas
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| MX | MXN | BR | BRL |
| AR | ARS | CL | CLP |
| CO | COP | PE | PEN |

### Asia Pacific
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| JP | JPY | KR | KRW* |
| TW | TWD | TH | THB |
| VN | VND | ID | IDR |

*KR requires separate data source with native KRW pricing

### Middle East & Other
| Country | Currency | Country | Currency |
|---------|----------|---------|----------|
| AE | AED | SA | SAR |
| IL | ILS | TR | TRY |
| RU | RUB | UA | UAH |

## Product Format

Each product synced to Merchant Center includes:

```javascript
{
  offerId: "product-uuid",           // Unique product ID
  title: "Quiz Title",               // Max 150 chars
  description: "Quiz description",   // Max 5000 chars
  link: "https://fatbigquiz.com/product/slug",
  imageLink: "https://cdn.../image.png",
  availability: "in_stock",          // or "out_of_stock"
  price: { value: "1.99", currency: "GBP" },
  brand: "Fat Big Quiz",
  condition: "new",

  // Free shipping to all 57 countries
  shipping: [
    { country: "GB", service: "Digital Download - Instant Delivery", price: { value: "0", currency: "GBP" } },
    { country: "US", service: "Digital Download - Instant Delivery", price: { value: "0", currency: "GBP" } },
    // ... 55 more countries
  ],

  // Custom labels for Google Ads filtering
  customLabel0: "Basic Quiz",        // Quiz format
  customLabel1: "DIGITAL_DOWNLOAD",  // Product type

  // Digital products don't have GTINs
  identifierExists: false
}
```

## Admin Panel

Access: `https://fatbigquiz.com/admin/google-merchant`

### Features
- **Connection Status**: See if API is configured and connected
- **Sync All Products**: Push all database products to Merchant Center
- **View Products**: See all products currently in Merchant Center
- **Delete Products**: Remove individual or all products
- **Product Status**: View approval status and any issues

## Troubleshooting

### "Merchant API not configured"
- Check `GOOGLE_MERCHANT_ID` environment variable
- Check `GOOGLE_APPLICATION_CREDENTIALS` path exists

### "Invalid name" errors during delete
- This was a gRPC encoding bug in the `@google-shopping/products` library
- Solution: Use REST-based Content API for Shopping (v2.1) for deletions
- Or use "Delete Data Sources" as nuclear option

### Products not showing in Google Shopping
- Products require 3 business days for initial review
- Check product status for approval issues
- Common issues: missing shipping info, policy violations

### KR products have shipping errors
- KR products must use KRW currency for both price AND shipping
- Mixing currencies (GBP price + KRW shipping) causes errors
- Solution: Separate data source with KRW-only products

## Code Files

| File | Purpose |
|------|---------|
| `server/services/merchantApi.js` | Core API service (gRPC + REST clients) |
| `server/routes/merchant.js` | Express routes for API endpoints |
| `server/utils/merchantFeed.js` | Product formatting and validation |
| `app/(dashboard)/admin/google-merchant/page.tsx` | Admin UI |

## Technical Details

### Libraries Used
- `@google-shopping/products` - New Merchant API (gRPC) for product upsert
- `@google-shopping/datasources` - Data source management
- `googleapis` - Content API v2.1 (REST) for reliable deletions

### API Versions
- **Merchant API** (new): Used for listing and upserting products
- **Content API v2.1** (legacy): Used for reliable product deletion

### Why Two APIs?

The new Merchant API uses gRPC which has encoding bugs in the delete operation (garbled UTF-8 characters in product IDs). The legacy Content API v2.1 uses REST and works reliably for deletions.

Product ID format for Content API deletion:
```
online:en:FEEDLABEL:OFFERID
```

Examples:
- `online:en:FATBIGQUIZ-DOWNLOADS:abc123` (main product)
- `online:en:KR:abc123-KR` (Korean variant)

## Exchange Rates

For markets requiring local currency:

| Market | Currency | Rate (per 1 GBP) |
|--------|----------|------------------|
| South Korea | KRW | ~1700 |

Update rates in `server/utils/merchantFeed.js` if needed.

## Adding New Countries

### If country supports GBP auto-conversion:
1. Add to `TARGET_MARKETS` in `server/utils/merchantFeed.js`
2. Resync all products

### If country requires local currency:
1. Add to `LOCAL_CURRENCY_MARKETS` with exchange rate
2. Create new data source in `merchantApi.js` (like KR)
3. Update deletion logic to handle new feed label
4. Resync all products
