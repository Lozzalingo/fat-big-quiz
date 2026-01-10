# Google Search Console Indexing API Setup

This guide explains how to set up the Google Indexing API to programmatically submit URLs for indexing.

---

## Prerequisites

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable the Indexing API

1. Go to **APIs & Services > Library**
2. Search for "Web Search Indexing API"
3. Click **Enable**

### 3. Create a Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Name it (e.g., `fatbigquiz-indexing`)
4. Grant no specific roles (not needed for this API)
5. Click **Done**

### 4. Download the JSON Key

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Choose **JSON** format
5. Download the file

### 5. Add Service Account to Search Console (CRUCIAL)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property (fatbigquiz.com)
3. Go to **Settings > Users and Permissions**
4. Click **Add User**
5. Enter the `client_email` from your JSON file (looks like `service-account-name@project-id.iam.gserviceaccount.com`)
6. Set permission to **Owner**
7. Click **Add**

---

## Installation

### 1. Place the Service Account Key

Save your downloaded JSON key file to:
```
server/config/google-service-account.json
```

**Important:** This file should NOT be committed to git. Add it to `.gitignore`:
```
server/config/google-service-account.json
```

### 2. Install Dependencies

```bash
cd server
npm install googleapis
```

### 3. Deploy to Server

Copy the service account key to the server:
```bash
scp server/config/google-service-account.json root@157.245.42.21:/root/fat-big-quiz/server/config/
```

---

## API Endpoints

### Check Configuration Status
```
GET /api/indexing/status
```

Response:
```json
{
  "configured": true,
  "message": "Google Indexing API is configured"
}
```

### Submit a Single URL
```
POST /api/indexing/submit
Content-Type: application/json

{
  "url": "https://fatbigquiz.com/product/my-quiz-pack",
  "type": "URL_UPDATED"
}
```

Types:
- `URL_UPDATED` - Submit new or updated content
- `URL_DELETED` - Remove a URL from the index

### Submit Multiple URLs
```
POST /api/indexing/submit-batch
Content-Type: application/json

{
  "urls": [
    "https://fatbigquiz.com/product/quiz-1",
    "https://fatbigquiz.com/product/quiz-2"
  ],
  "type": "URL_UPDATED"
}
```

Maximum 100 URLs per batch.

### Submit All Site URLs
```
POST /api/indexing/submit-all
```

Automatically fetches all published products and blog posts and submits them.

### Get URL Status
```
GET /api/indexing/url-status?url=https://fatbigquiz.com/product/my-quiz
```

### Preview All Indexable URLs
```
GET /api/indexing/urls
```

---

## Rate Limits

Google Indexing API has a quota of approximately **200 requests per day**.

- Use batch submission for efficiency
- Don't submit the same URL repeatedly
- Only submit URLs that have actually changed

---

## Automatic Indexing (Future Enhancement)

You can trigger indexing automatically when:
- A new product is published
- A blog post is created
- Content is updated

Add this to your product/blog controllers:
```javascript
const googleIndexing = require('../services/googleIndexing');

// After creating/updating a product
if (product.published) {
  const url = `https://fatbigquiz.com/product/${product.slug}`;
  await googleIndexing.submitUrl(url, 'URL_UPDATED');
}
```

---

## Troubleshooting

### "Service account key not found"
- Ensure the file exists at `server/config/google-service-account.json`
- Check file permissions

### "Permission denied" errors
- Verify the service account email is added to Search Console as Owner
- Wait a few minutes after adding the user

### "Quota exceeded"
- You've hit the daily limit of ~200 requests
- Wait 24 hours or optimize your submission strategy

---

## Environment Variables (Optional)

If you want to use a different key file location:
```env
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/your/key.json
SITE_URL=https://fatbigquiz.com
```

---

*Last updated: January 2026*
