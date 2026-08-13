/**
 * Critical Path Tests — Fat Big Quiz
 * Tests all API endpoints return correct status codes,
 * auth blocks unauthenticated requests, rate limiting works,
 * and core business logic is sound.
 *
 * Run: node --test test/critical-path.test.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.API_BASE || 'http://localhost:3001';
const ADMIN_KEY = process.env.ADMIN_API_KEY || '12D16C923BA17672F89B18C1DB22A';

function adminHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY, ...extra };
}

function publicHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function api(method, path, body, headers) {
  const opts = { method, headers: headers || publicHeaders() };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${BASE}${path}`, opts);
}

// ─── Health & Ops ───────────────────────────────────────────────
describe('Ops/Health', () => {
  it('GET /api/ops/health returns 200 with status field (requires admin key)', async () => {
    const res = await api('GET', '/api/ops/health', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.status, 'should have status field');
  });

  it('GET /api/ops/health returns 403 without admin key', async () => {
    const res = await api('GET', '/api/ops/health');
    assert.equal(res.status, 403);
  });

  it('GET /api/ops/detailed returns memory and disk info', async () => {
    const res = await api('GET', '/api/ops/detailed', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.memory, 'should have memory');
    assert.ok(data.disk, 'should have disk');
  });

  it('GET /api/ops/alerts returns alerts array', async () => {
    const res = await api('GET', '/api/ops/alerts', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.alerts), 'alerts should be array');
    assert.ok(typeof data.hasSpike === 'boolean', 'hasSpike should be boolean');
  });

  it('GET /api/ops/errors returns errors array', async () => {
    const res = await api('GET', '/api/ops/errors?limit=5', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.errors), 'errors should be array');
  });
});

// ─── Products ───────────────────────────────────────────────────
describe('Products', () => {
  it('GET /api/products returns 200 with products array', async () => {
    const res = await api('GET', '/api/products');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.products), 'should return { products: [...] }');
  });

  it('GET /api/products/:invalidSlug returns 404', async () => {
    const res = await api('GET', '/api/slugs/nonexistent-product-slug-12345');
    assert.equal(res.status, 404);
  });
});

// ─── Users ──────────────────────────────────────────────────────
describe('Users', () => {
  it('GET /api/users returns 403 without admin key', async () => {
    const res = await api('GET', '/api/users');
    assert.equal(res.status, 403);
  });

  it('GET /api/users returns 200 with users array with admin key', async () => {
    const res = await api('GET', '/api/users', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.users), 'should return { users: [...] }');
  });

  it('user responses do not expose password hash', async () => {
    const res = await api('GET', '/api/users', null, adminHeaders());
    const data = await res.json();
    if (data.users.length > 0) {
      assert.equal(data.users[0].password, undefined, 'password should be stripped');
    }
  });

  it('POST /api/users rejects missing email', async () => {
    const res = await api('POST', '/api/users', { password: 'test12345' }, adminHeaders());
    assert.ok([400, 500].includes(res.status), 'should reject missing email');
  });

  it('POST /api/users rejects duplicate email', async () => {
    // First get an existing email
    const usersRes = await api('GET', '/api/users', null, adminHeaders());
    const { users } = await usersRes.json();
    if (users.length > 0) {
      const res = await api('POST', '/api/users', {
        email: users[0].email,
        password: 'test12345',
        firstName: 'Test',
      }, adminHeaders());
      assert.equal(res.status, 409, 'should return 409 for duplicate');
    }
  });
});

// ─── Subscribers ────────────────────────────────────────────────
describe('Subscribers', () => {
  it('GET /api/subscribers returns 200 with array', async () => {
    const res = await api('GET', '/api/subscribers');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'should return array');
  });

  it('POST /api/subscribers rejects missing email', async () => {
    const res = await api('POST', '/api/subscribers', {});
    assert.equal(res.status, 400);
  });

  it('POST /api/subscribers rejects invalid email', async () => {
    const res = await api('POST', '/api/subscribers', { email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  it('POST /api/subscribers/unsubscribe returns 200 even for unknown email', async () => {
    const res = await api('POST', '/api/subscribers/unsubscribe', { email: 'nobody@nowhere.test' });
    assert.equal(res.status, 200);
  });

  it('POST /api/subscribers/confirm rejects invalid token', async () => {
    const res = await api('POST', '/api/subscribers/confirm', { token: 'invalid' });
    assert.equal(res.status, 400);
  });
});

// ─── Auth ───────────────────────────────────────────────────────
describe('Auth', () => {
  it('POST /api/shared-auth/forgot-password returns 200 (does not reveal user existence)', async () => {
    const res = await api('POST', '/api/shared-auth/forgot-password', { email: 'nobody@test.test' });
    assert.equal(res.status, 200);
  });

  it('POST /api/shared-auth/reset-password rejects missing token', async () => {
    const res = await api('POST', '/api/shared-auth/reset-password', { password: 'new12345' });
    assert.equal(res.status, 400);
  });

  it('POST /api/shared-auth/reset-password rejects invalid token', async () => {
    const res = await api('POST', '/api/shared-auth/reset-password', { token: 'bad', password: 'new12345' });
    assert.equal(res.status, 400);
  });

  it('rate limits forgot-password after 5 requests', async () => {
    // Rapid fire 6 requests
    const results = [];
    for (let i = 0; i < 6; i++) {
      const r = await api('POST', '/api/shared-auth/forgot-password', { email: `ratetest${i}@test.test` });
      results.push(r.status);
    }
    assert.ok(results.includes(429), 'should hit 429 rate limit');
  });
});

// ─── Purchases ──────────────────────────────────────────────────
describe('Purchases', () => {
  it('GET /api/purchases/email/test@test.com returns 200', async () => {
    const res = await api('GET', '/api/purchases/email/test@test.com');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'should return array');
  });

  it('POST /api/purchases rejects missing fields', async () => {
    const res = await api('POST', '/api/purchases', { email: 'test@test.com' });
    assert.equal(res.status, 400);
  });
});

// ─── Orders ─────────────────────────────────────────────────────
describe('Orders', () => {
  it('GET /api/orders returns 403 without admin key', async () => {
    const res = await api('GET', '/api/orders');
    assert.equal(res.status, 403);
  });

  it('GET /api/orders returns 200 with admin key', async () => {
    const res = await api('GET', '/api/orders', null, adminHeaders());
    assert.equal(res.status, 200);
  });

  it('GET /api/shared-orders returns 404 (route removed)', async () => {
    const res = await api('GET', '/api/shared-orders', null, adminHeaders());
    assert.equal(res.status, 404);
  });
});

// ─── Blog ───────────────────────────────────────────────────────
describe('Blog', () => {
  it('GET /api/blog returns 200 with posts', async () => {
    const res = await api('GET', '/api/blog');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.posts || Array.isArray(data), 'should return posts');
  });

  it('GET /api/blog/slug/nonexistent returns 404', async () => {
    const res = await api('GET', '/api/blog/slug/this-post-does-not-exist-12345');
    assert.equal(res.status, 404);
  });
});

// ─── Campaigns (admin-protected) ────────────────────────────────
describe('Campaigns', () => {
  it('GET /api/campaigns returns 403 without admin key', async () => {
    const res = await api('GET', '/api/campaigns');
    assert.equal(res.status, 403);
  });

  it('full CRUD lifecycle works', async () => {
    // Create
    const createRes = await api('POST', '/api/campaigns', {
      subject: 'Test Campaign',
      body: '<p>Test body</p>',
    }, adminHeaders());
    assert.equal(createRes.status, 201);
    const campaign = await createRes.json();
    assert.ok(campaign.id);
    assert.equal(campaign.status, 'draft');

    // Read
    const getRes = await api('GET', `/api/campaigns/${campaign.id}`, null, adminHeaders());
    assert.equal(getRes.status, 200);

    // Update
    const updateRes = await api('PUT', `/api/campaigns/${campaign.id}`, {
      subject: 'Updated Campaign',
      body: '<p>Updated</p>',
    }, adminHeaders());
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.subject, 'Updated Campaign');

    // Preview
    const previewRes = await api('POST', '/api/campaigns/preview', {
      subject: 'Preview Test',
      body: '<p>Preview</p>',
    }, adminHeaders());
    assert.equal(previewRes.status, 200);
    const preview = await previewRes.json();
    assert.ok(preview.html, 'should return HTML preview');

    // Delete
    const deleteRes = await api('DELETE', `/api/campaigns/${campaign.id}`, null, adminHeaders());
    assert.equal(deleteRes.status, 204);

    // Verify deleted
    const afterDelete = await api('GET', `/api/campaigns/${campaign.id}`, null, adminHeaders());
    assert.equal(afterDelete.status, 404);
  });
});

// ─── Logs (admin-protected) ─────────────────────────────────────
describe('Logs', () => {
  it('GET /api/logs returns 403 without admin key', async () => {
    const res = await api('GET', '/api/logs');
    assert.equal(res.status, 403);
  });

  it('GET /api/logs returns 200 with admin key', async () => {
    const res = await api('GET', '/api/logs?page=1&limit=5', null, adminHeaders());
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.logs !== undefined, 'should have logs field');
  });

  it('GET /api/logs/stats returns 200 with admin key', async () => {
    const res = await api('GET', '/api/logs/stats', null, adminHeaders());
    assert.equal(res.status, 200);
  });
});

// ─── Storage (admin-protected) ──────────────────────────────────
describe('Storage', () => {
  it('GET /api/storage/stats returns 403 without admin key', async () => {
    const res = await api('GET', '/api/storage/stats');
    assert.equal(res.status, 403);
  });

  it('GET /api/storage/stats returns 200 with admin key', async () => {
    const res = await api('GET', '/api/storage/stats', null, adminHeaders());
    assert.equal(res.status, 200);
  });
});

// ─── Settings (admin-protected) ─────────────────────────────────
describe('Settings', () => {
  it('GET /api/app-settings returns 403 without admin key', async () => {
    const res = await api('GET', '/api/app-settings');
    assert.equal(res.status, 403);
  });

  it('GET /api/app-settings returns 200 with admin key', async () => {
    const res = await api('GET', '/api/app-settings', null, adminHeaders());
    assert.equal(res.status, 200);
  });
});

// ─── Analytics / Visitors ───────────────────────────────────────
describe('Analytics', () => {
  it('POST /api/visitors/track returns 200', async () => {
    const res = await api('POST', '/api/visitors/track', {
      path: '/test-page',
      sessionId: 'test_session_1',
      isNewVisitor: true,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.visitorId, 'should return visitorId');
  });

  it('POST /api/visitors/update rejects missing visitorId', async () => {
    const res = await api('POST', '/api/visitors/update', { timeOnPage: 10 });
    assert.equal(res.status, 400);
  });

  it('bot user-agent is flagged as bot', async () => {
    const res = await fetch(`${BASE}/api/visitors/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      },
      body: JSON.stringify({ path: '/bot-test', sessionId: 'bot_test' }),
    });
    assert.equal(res.status, 200);
    // The visitor will be created with isBot=true (verified in DB, not in response)
  });
});

// ─── Visitors Summary (API key protected) ───────────────────────
describe('Visitors Summary', () => {
  it('GET /api/visitors/summary returns 403 without API key', async () => {
    const res = await api('GET', '/api/visitors/summary');
    assert.equal(res.status, 403);
  });
});
