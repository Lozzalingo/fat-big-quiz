/**
 * Lozzalingo SSO auth client for Next.js apps.
 *
 * Mirrors the logic of auth_client.py (Python) exactly:
 * 1. Check for auth_token in URL query param -> validate -> set cookie -> meta-refresh to clean URL
 * 2. Check for auth_token cookie -> validate -> authenticated
 * 3. No valid token -> redirect to auth login
 *
 * Works in Next.js middleware (Edge Runtime compatible).
 *
 * CRITICAL: Uses 200 + meta-refresh (not 302) when setting the auth_token cookie.
 * Cloudflare strips Set-Cookie headers from 302 responses.
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://auth.laurence.computer';

/** Hosts that are considered local dev (no https forcing). */
const LOCALHOST_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

export interface SSOPayload {
  user_id: number;
  email: string;
  site_id: string | null;
  is_super_admin: boolean;
  site_access: Array<{ site_id: string; role: string }>;
  iat: number;
  exp: number;
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build the canonical external URL for a request.
 *
 * Inside Docker, request.nextUrl reports the container hostname (e.g.
 * "e787e30b804a:3009") instead of the real domain. We reconstruct the URL
 * from the Host header (forwarded by Nginx) and force https:// for
 * non-localhost domains (behind Cloudflare, the scheme is always http).
 *
 * Matches _clean_redirect_url in auth_client.py.
 */
function buildExternalUrl(
  request: import('next/server').NextRequest
): string {
  const host = request.headers.get('host') || request.nextUrl.host;
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const isLocal = LOCALHOST_HOSTS.some(h => host.startsWith(h));
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${host}${pathname}${search}`;
}

// ---------------------------------------------------------------------------
// RS256 public key cache (fetched from JWKS endpoint)
// ---------------------------------------------------------------------------

let _rs256CryptoKey: CryptoKey | null = null;
let _rs256LastFetch = 0;
const RS256_CACHE_TTL = 3600 * 1000; // Re-fetch public key every hour

async function _fetchRS256PublicKey(): Promise<CryptoKey | null> {
  const now = Date.now();
  if (_rs256CryptoKey && (now - _rs256LastFetch) < RS256_CACHE_TTL) {
    return _rs256CryptoKey;
  }

  try {
    const resp = await fetch(`${AUTH_SERVICE_URL}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      console.error('[Auth-SSO] JWKS fetch failed:', resp.status);
      return _rs256CryptoKey;
    }
    const jwks = await resp.json();
    const keys = (jwks.keys || []) as Record<string, string>[];
    if (!keys.length) {
      console.error('[Auth-SSO] JWKS response has no keys');
      return _rs256CryptoKey;
    }

    const jwk = keys.find((k) => k.alg === 'RS256') || keys[0];

    _rs256CryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    _rs256LastFetch = now;
    console.log('[Auth-SSO] RS256 public key fetched and cached');
    return _rs256CryptoKey;
  } catch (err) {
    console.error('[Auth-SSO] Failed to fetch JWKS:', err);
    return _rs256CryptoKey;
  }
}

/**
 * Verify a JWT (RS256 or HS256) using the Web Crypto API (Edge Runtime compatible).
 * Returns the payload or null if invalid/expired.
 *
 * Verification order (mirrors auth_client.py):
 * 1. RS256 using the public key from the auth service JWKS endpoint
 * 2. HS256 using AUTH_JWT_SECRET (migration fallback)
 *
 * Equivalent to decode_jwt() in auth_client.py.
 */
export async function verifySSOToken(token: string): Promise<SSOPayload | null> {
  try {
    console.log('[Auth-SSO] verifySSOToken called, token length:', token.length, 'first 20 chars:', token.substring(0, 20), 'has dots:', token.includes('.'));
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[Auth-SSO] Malformed token: expected 3 parts, got', parts.length, 'token preview:', token.substring(0, 50));
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const alg = header.alg;

    const payload: SSOPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn('[Auth-SSO] Token expired at', new Date(payload.exp * 1000).toISOString());
      return null;
    }

    const encoder = new TextEncoder();
    const sigInput = encoder.encode(`${headerB64}.${payloadB64}`);

    // Copy signature into a fresh ArrayBuffer view. Edge Runtime sandbox uses
    // realm-specific instanceof checks on ArrayBuffer, so raw Uint8Arrays from
    // base64UrlDecode fail. new Uint8Array(new ArrayBuffer(...)) creates a
    // Uint8Array<ArrayBuffer> which satisfies both tsc and the runtime.
    const sigBytes = base64UrlDecode(signatureB64);
    const sigView = new Uint8Array(new ArrayBuffer(sigBytes.byteLength));
    sigView.set(sigBytes);

    // RS256 verification (primary)
    if (alg === 'RS256') {
      console.log('[Auth-SSO] RS256 token detected for', payload.email, '- fetching public key');
      const pubKey = await _fetchRS256PublicKey();
      if (!pubKey) {
        console.warn('[Auth-SSO] RS256 token but no public key available');
        return null;
      }
      console.log('[Auth-SSO] Public key available, verifying RS256 signature');
      let valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubKey, sigView, sigInput);
      if (!valid) {
        _rs256LastFetch = 0;
        const newKey = await _fetchRS256PublicKey();
        if (newKey) {
          valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', newKey, sigView, sigInput);
        }
        if (!valid) {
          console.warn('[Auth-SSO] RS256 signature verification failed');
          return null;
        }
      }
      console.log('[Auth-SSO] RS256 token valid for', payload.email);
      return payload;
    }

    // HS256 verification (legacy fallback)
    if (alg === 'HS256') {
      const secret = process.env.AUTH_JWT_SECRET;
      if (!secret) {
        console.error('[Auth-SSO] HS256 token but AUTH_JWT_SECRET is not set');
        return null;
      }
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify('HMAC', key, sigView, sigInput);
      if (!valid) {
        console.warn('[Auth-SSO] HS256 signature verification failed');
        return null;
      }
      console.log('[Auth-SSO] HS256 token valid for', payload.email);
      return payload;
    }

    console.warn('[Auth-SSO] Unsupported algorithm:', alg);
    return null;
  } catch (err) {
    console.error('[Auth-SSO] Token verification threw:', err);
    return null;
  }
}

/**
 * Equivalent to require_auth in auth_client.py.
 *
 * Call this from middleware on protected routes. It handles the full flow:
 * 1. auth_token in URL? -> validate, set cookie via 200 + meta-refresh to clean URL
 * 2. auth_token cookie? -> validate, return payload
 * 3. Nothing? -> redirect to auth login
 *
 * Returns either a NextResponse (redirect/response) or a payload (authenticated).
 *
 * CRITICAL: Step 1 returns a 200 with meta-refresh, NOT a 302 redirect.
 * Cloudflare strips Set-Cookie headers from 302 responses.
 */
export async function requireAuth(
  request: import('next/server').NextRequest,
  NextResponse: typeof import('next/server').NextResponse
): Promise<
  | { redirect: import('next/server').NextResponse }
  | { payload: SSOPayload }
> {
  // 1. Check for token in query param (cross-domain SSO redirect from auth service)
  const tokenFromUrl = request.nextUrl.searchParams.get('auth_token');
  if (tokenFromUrl) {
    console.log('[Auth-SSO] Step 1: auth_token found in URL for', request.nextUrl.pathname, '- validating');
    const payload = await verifySSOToken(tokenFromUrl);
    if (payload) {
      // Build the clean external URL (strips auth_token, fixes host + protocol)
      const extUrl = new URL(buildExternalUrl(request));
      extUrl.searchParams.delete('auth_token');
      const cleanUrl = extUrl.toString();
      console.log('[Auth-SSO] Step 1: URL token valid - setting cookie + meta-refresh to', cleanUrl);

      // CRITICAL: Use 200 + meta-refresh instead of 302.
      // Cloudflare strips Set-Cookie from 302 responses.
      const html = `<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0;url=${cleanUrl}"></head>
<body>Redirecting...</body>
</html>`;

      // CRITICAL: Cache-Control: no-store prevents Cloudflare from caching this
      // response. If Cloudflare caches the meta-refresh page it strips Set-Cookie,
      // the auth_token cookie is never set, and the user loops forever at login.
      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
      response.cookies.set('auth_token', tokenFromUrl, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 900,
        path: '/',
      });
      return { redirect: response };
    }
    console.warn('[Auth-SSO] Step 1: URL token INVALID - falling through to cookie check');
  }

  // 2. Check cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    console.log('[Auth-SSO] Step 2: auth_token cookie found - validating');
    const payload = await verifySSOToken(cookieToken);
    if (payload) {
      console.log('[Auth-SSO] Step 2: cookie valid - authenticated as', payload.email, '(super_admin:', payload.is_super_admin + ')');
      return { payload };
    }
    console.warn('[Auth-SSO] Step 2: cookie INVALID - will redirect to login');
  } else {
    console.log('[Auth-SSO] Step 2: no auth_token cookie present');
  }

  // 3. No valid token: redirect to auth login
  // Build external URL with auth_token stripped, correct host + https
  const extUrl = new URL(buildExternalUrl(request));
  extUrl.searchParams.delete('auth_token');
  const cleanUrl = extUrl.toString();
  const loginUrl = `${AUTH_SERVICE_URL}/login?redirect=${encodeURIComponent(cleanUrl)}`;
  console.log('[Auth-SSO] Step 3: no valid token - redirecting to login:', loginUrl);
  return { redirect: NextResponse.redirect(loginUrl) };
}
