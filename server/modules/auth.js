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
      const token = req.cookies?.[COOKIE_NAME];

      if (!token) {
        return res.json({ user: null, status: 'unauthenticated' });
      }

      if (!JWT_SECRET) {
        console.error('[Auth] AUTH_JWT_SECRET not configured');
        return res.json({ user: null, status: 'unauthenticated' });
      }

      const payload = verifyJWT(token);

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

module.exports = { registerRoutes, verifyJWT, COOKIE_NAME };
