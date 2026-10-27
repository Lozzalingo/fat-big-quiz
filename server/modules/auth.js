/**
 * Auth Module - Fat Big Quiz
 *
 * Handles user authentication via auth.laurence.computer with local bcrypt fallback.
 * Replaces NextAuth with centralised auth service integration.
 *
 * Routes:
 *   POST /api/auth/login     - Login via auth service (or local fallback), set cookie
 *   POST /api/auth/register  - Register via auth service (or local fallback), set cookie
 *   POST /api/auth/logout    - Clear cookie
 *   GET  /api/auth/session   - Verify cookie JWT, return enriched user data
 *   POST /api/auth/refresh   - Refresh access token
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'https://auth.laurence.computer').replace(/\/+$/, '');
const AUTH_API_KEY = process.env.AUTH_SITE_API_KEY || process.env.AUTH_API_KEY || '';
const SITE_ID = 'fat-big-quiz';
const JWT_SECRET = process.env.AUTH_JWT_SECRET || '';
const COOKIE_NAME = `lza_user_${SITE_ID}`;
const IS_PROD = process.env.NODE_ENV === 'production';
const ACCESS_TTL = 900; // 15 minutes in seconds

// ─── JWT Helpers ──────────────────────────────────────────────────────────────
// Uses UTF-8 encoding of the secret to match the Python auth service (PyJWT).
// The @lozzalingo/auth verifyHS256 auto-detects hex strings and decodes them
// differently, which breaks verification of tokens signed by the Python service.

function secretBuffer() {
  return Buffer.from(JWT_SECRET, 'utf8');
}

function signJWT(payload, ttl = ACCESS_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + ttl };
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', secretBuffer()).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function verifyJWT(token) {
  if (!token || !JWT_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const [h, p, s] = parts;
    const expected = crypto.createHmac('sha256', secretBuffer()).update(`${h}.${p}`).digest('base64url');
    const sBuf = Buffer.from(s);
    const eBuf = Buffer.from(expected);
    if (sBuf.length !== eBuf.length || !crypto.timingSafeEqual(sBuf, eBuf)) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ─── RS256 Public Key Cache (JWKS) ──────────────────────────────────────────
let _rs256PublicKey = null;
let _rs256LastFetch = 0;
const RS256_CACHE_TTL = 3600 * 1000; // 1 hour

async function _fetchRS256PublicKey() {
  const now = Date.now();
  if (_rs256PublicKey && (now - _rs256LastFetch) < RS256_CACHE_TTL) {
    return _rs256PublicKey;
  }
  try {
    const resp = await fetch(`${AUTH_SERVICE_URL}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      console.error('[Auth] JWKS fetch failed:', resp.status);
      return _rs256PublicKey;
    }
    const jwks = await resp.json();
    const keys = jwks.keys || [];
    if (!keys.length) {
      console.error('[Auth] JWKS response has no keys');
      return _rs256PublicKey;
    }
    const jwk = keys.find(k => k.alg === 'RS256') || keys[0];
    _rs256PublicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    _rs256LastFetch = now;
    console.log('[Auth] RS256 public key fetched and cached');
    return _rs256PublicKey;
  } catch (err) {
    console.error('[Auth] Failed to fetch JWKS:', err.message);
    return _rs256PublicKey;
  }
}

/**
 * Verify an RS256 JWT using the auth service's public key.
 * Returns the decoded payload or null.
 */
async function verifyRS256(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (header.alg !== 'RS256') return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    const pubKey = await _fetchRS256PublicKey();
    if (!pubKey) {
      console.warn('[Auth] RS256 token but no public key available');
      return null;
    }

    const sigInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');
    const valid = crypto.verify(
      'sha256',
      Buffer.from(sigInput),
      { key: pubKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      signature
    );

    if (valid) {
      console.log('[Auth] RS256 token valid for:', payload.email);
      return payload;
    }

    // Key might have rotated, retry with fresh key
    _rs256LastFetch = 0;
    const newKey = await _fetchRS256PublicKey();
    if (newKey) {
      const retryValid = crypto.verify(
        'sha256',
        Buffer.from(sigInput),
        { key: newKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        signature
      );
      if (retryValid) {
        console.log('[Auth] RS256 token valid (after key refresh) for:', payload.email);
        return payload;
      }
    }

    return null;
  } catch (err) {
    console.error('[Auth] RS256 verification error:', err.message);
    return null;
  }
}

// ─── Auth Service Client ──────────────────────────────────────────────────────

async function authServiceRequest(endpoint, { method = 'POST', body, token } = {}) {
  if (!AUTH_API_KEY) return null; // No API key configured, skip auth service
  const url = `${AUTH_SERVICE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': AUTH_API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    console.log(`[Auth] ${method} ${url}`);
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) {
      console.error(`[Auth] ${method} ${url} responded ${res.status}:`, json);
      return { _error: true, status: res.status, ...json };
    }
    return json;
  } catch (err) {
    console.error(`[Auth] ${method} ${url} failed:`, err.message);
    return null;
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: ACCESS_TTL * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// ─── Local User Helpers ───────────────────────────────────────────────────────

async function ensureLocalUser(email, extraData = {}) {
  const normalised = email.toLowerCase().trim();
  let user = await prisma.user.findFirst({ where: { email: normalised } });

  if (!user) {
    console.log('[Auth] Creating local user record for:', normalised);
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: normalised,
        password: '__auth_service__',
        ...extraData,
      },
    });
    console.log('[Auth] Local user created:', user.id);
  }

  return user;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function registerRoutes(app, options = {}) {

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      console.log('[Auth] Login attempt for:', cleanEmail);

      let accessToken = null;

      // 1. Try auth service first (if API key is configured)
      if (AUTH_API_KEY) {
        const result = await authServiceRequest('/api/users/login', {
          body: { siteId: SITE_ID, email: cleanEmail, password },
        });

        if (result && !result._error) {
          accessToken = result.access_token;
          console.log('[Auth] Auth service login successful for:', cleanEmail);
        }
      }

      // 2. Fallback to local bcrypt auth (for pre-migration users)
      if (!accessToken) {
        const localUser = await prisma.user.findFirst({ where: { email: cleanEmail } });

        if (!localUser || !localUser.password || localUser.password === '__auth_service__') {
          console.log('[Auth] Login failed - user not found or no local password:', cleanEmail);
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, localUser.password);
        if (!valid) {
          console.log('[Auth] Login failed - wrong password:', cleanEmail);
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('[Auth] Local bcrypt login successful for:', cleanEmail);

        // Issue a local JWT
        accessToken = signJWT({
          user_id: localUser.id,
          email: cleanEmail,
          site_id: SITE_ID,
          is_super_admin: false,
        });

        // Auto-register in auth service for future logins (non-blocking)
        if (AUTH_API_KEY) {
          authServiceRequest('/api/users/register', {
            body: { siteId: SITE_ID, email: cleanEmail, password },
          }).catch(() => {});
        }
      }

      // Look up local user for role info
      const localUser = await ensureLocalUser(cleanEmail);

      setAuthCookie(res, accessToken);

      console.log('[Auth] Login complete for:', cleanEmail);
      return res.json({
        success: true,
        user: {
          id: localUser.id,
          email: localUser.email,
          role: localUser.role || 'user',
          userName: localUser.userName || null,
          avatar: localUser.avatar || null,
        },
      });
    } catch (error) {
      console.error('[Auth] Login error:', error.message);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const cleanEmail = email.toLowerCase().trim();
      console.log('[Auth] Registration attempt for:', cleanEmail);

      // Check local DB first for faster feedback
      const existing = await prisma.user.findFirst({ where: { email: cleanEmail } });
      if (existing && existing.password !== '__auth_service__') {
        return res.status(400).json({ error: 'Email is already in use' });
      }

      let accessToken = null;

      // 1. Try auth service first
      if (AUTH_API_KEY) {
        const result = await authServiceRequest('/api/users/register', {
          body: { siteId: SITE_ID, email: cleanEmail, password },
        });

        if (result && !result._error) {
          accessToken = result.access_token;
          console.log('[Auth] Auth service registration successful for:', cleanEmail);
        } else if (result?._error && result.status !== 409) {
          console.error('[Auth] Auth service registration error:', result);
        }
      }

      // 2. Create local user (with bcrypt password for local fallback)
      let localUser;
      if (existing) {
        // Update existing placeholder record
        const hashedPassword = await bcrypt.hash(password, 5);
        localUser = await prisma.user.update({
          where: { id: existing.id },
          data: { password: hashedPassword },
        });
      } else {
        const hashedPassword = await bcrypt.hash(password, 5);
        localUser = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email: cleanEmail,
            password: hashedPassword,
          },
        });
      }

      // Issue local JWT if auth service did not provide one
      if (!accessToken) {
        accessToken = signJWT({
          user_id: localUser.id,
          email: cleanEmail,
          site_id: SITE_ID,
          is_super_admin: false,
        });
      }

      setAuthCookie(res, accessToken);

      console.log('[Auth] Registration complete for:', cleanEmail);
      return res.json({
        success: true,
        user: {
          id: localUser.id,
          email: localUser.email,
          role: localUser.role || 'user',
        },
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error.message);
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (req, res) => {
    try {
      clearAuthCookie(res);
      console.log('[Auth] User logged out');
      return res.json({ success: true });
    } catch (error) {
      console.error('[Auth] Logout error:', error.message);
      clearAuthCookie(res);
      return res.json({ success: true });
    }
  });

  // GET /api/auth/session
  app.get('/api/auth/session', async (req, res) => {
    try {
      // Check per-site cookie first, then SSO cookie (auth_token from auth.laurence.computer)
      const siteToken = req.cookies?.[COOKIE_NAME];
      const ssoToken = req.cookies?.['auth_token'];
      const token = siteToken || ssoToken;

      if (!token) {
        return res.json({ user: null, status: 'unauthenticated' });
      }

      // Try HS256 first, then RS256 for SSO tokens
      let payload = null;
      if (JWT_SECRET) {
        payload = verifyJWT(token);
      }
      if (!payload) {
        payload = await verifyRS256(token);
      }

      if (!payload) {
        console.log('[Auth] Session JWT invalid or expired');
        clearAuthCookie(res);
        return res.json({ user: null, status: 'unauthenticated' });
      }

      // Look up local user for app-specific data (role, subscriptions, etc.)
      const email = payload.email;
      if (!email) {
        console.log('[Auth] JWT missing email field');
        return res.json({ user: null, status: 'unauthenticated' });
      }

      let localUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          role: true,
          userName: true,
          firstName: true,
          lastName: true,
          avatar: true,
          subscriptionStatus: true,
        },
      });

      if (!localUser) {
        const provisioned = await ensureLocalUser(email);
        localUser = provisioned;
      }

      return res.json({
        user: {
          id: localUser.id,
          email: localUser.email,
          role: localUser.role || 'user',
          userName: localUser.userName || null,
          firstName: localUser.firstName || null,
          lastName: localUser.lastName || null,
          avatar: localUser.avatar || null,
          subscriptionStatus: localUser.subscriptionStatus || null,
          is_super_admin: payload.is_super_admin || false,
        },
        status: 'authenticated',
        token,
      });
    } catch (error) {
      console.error('[Auth] Session check error:', error.message);
      return res.json({ user: null, status: 'unauthenticated' });
    }
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token || !AUTH_API_KEY) {
        return res.status(401).json({ error: 'Refresh not available' });
      }

      const result = await authServiceRequest('/api/refresh', {
        body: { refresh_token },
      });

      if (!result || result._error || !result.access_token) {
        console.log('[Auth] Token refresh failed:', result?.error);
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Refresh failed' });
      }

      setAuthCookie(res, result.access_token);

      console.log('[Auth] Token refreshed successfully');
      return res.json({ success: true });
    } catch (error) {
      console.error('[Auth] Refresh error:', error.message);
      return res.status(500).json({ error: 'Refresh failed' });
    }
  });

  console.log('[FBQ] Auth module registered (auth.laurence.computer + local fallback)');
}

module.exports = { registerRoutes, verifyJWT, verifyRS256, COOKIE_NAME };
