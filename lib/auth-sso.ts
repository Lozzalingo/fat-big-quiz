/**
 * Lozzalingo SSO auth client for Next.js apps.
 *
 * Mirrors the logic of auth_client.py (Python) exactly:
 * 1. Check for auth_token in URL query param -> validate -> set cookie -> strip param -> redirect
 * 2. Check for auth_token cookie -> validate -> authenticated
 * 3. No valid token -> redirect to auth login
 *
 * Works in Next.js middleware (Edge Runtime compatible).
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://auth.laurence.computer';

/**
 * Clean a redirect URL: strip stale auth_token params and force the correct
 * public base URL. Behind Docker/nginx/Cloudflare, request.url often reports
 * an internal host (0.0.0.0:3000, localhost:3000) instead of the real domain.
 *
 * Mirrors _clean_redirect_url() from Python auth_client.py.
 */
export function cleanRedirectUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    // Strip stale auth_token param
    parsed.searchParams.delete('auth_token');

    // If we have a configured public base URL, replace the host/protocol
    // to avoid leaking internal Docker hosts into the auth redirect
    const publicBase = process.env.NEXT_PUBLIC_BASE_URL;
    if (publicBase) {
      const pub = new URL(publicBase);
      parsed.protocol = pub.protocol;
      parsed.host = pub.host;
    } else {
      // Fallback: force https:// and strip internal ports for non-localhost domains
      const localhostHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
      const hostname = parsed.hostname;
      if (!localhostHosts.includes(hostname)) {
        parsed.protocol = 'https:';
        parsed.port = '';
      }
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

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
 */
export async function verifySSOToken(token: string): Promise<SSOPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const alg = header.alg;

    const payload: SSOPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

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
      const pubKey = await _fetchRS256PublicKey();
      if (!pubKey) return null;
      let valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pubKey, sigView, sigInput);
      if (!valid) {
        _rs256LastFetch = 0;
        const newKey = await _fetchRS256PublicKey();
        if (newKey) {
          valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', newKey, sigView, sigInput);
        }
        if (!valid) return null;
      }
      return payload;
    }

    // HS256 verification (legacy fallback)
    if (alg === 'HS256') {
      const secret = process.env.AUTH_JWT_SECRET;
      if (!secret) return null;
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify('HMAC', key, sigView, sigInput);
      if (!valid) return null;
      return payload;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Equivalent to require_auth in auth_client.py.
 *
 * Call this from middleware on protected routes. It handles the full flow:
 * 1. auth_token in URL? -> validate, set cookie, strip param, redirect (clean URL)
 * 2. auth_token cookie? -> validate, return payload
 * 3. Nothing? -> redirect to auth login
 *
 * Returns either a NextResponse (redirect) or a payload (authenticated).
 */
export async function requireAuth(
  request: import('next/server').NextRequest,
  NextResponse: typeof import('next/server').NextResponse
): Promise<
  | { redirect: import('next/server').NextResponse }
  | { payload: SSOPayload }
> {
  const url = request.nextUrl.clone();

  // 1. Check for token in query param (cross-domain SSO redirect from auth service)
  const tokenFromUrl = url.searchParams.get('auth_token');
  if (tokenFromUrl) {
    const payload = await verifySSOToken(tokenFromUrl);
    if (payload) {
      // Strip auth_token from URL, set cookie, and redirect to clean URL.
      // Use a 200 HTML response with meta-refresh instead of a 302 redirect
      // because Cloudflare strips Set-Cookie headers from 302 responses.
      url.searchParams.delete('auth_token');
      const cleanTarget = cleanRedirectUrl(url.toString());
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${cleanTarget}"><title>Logging you in...</title></head><body></body></html>`;
      // CRITICAL: Cache-Control: no-store prevents Cloudflare from caching this
      // response. If Cloudflare caches the meta-refresh page it strips Set-Cookie,
      // the auth_token cookie is never set, and the user loops forever at login.
      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
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
  }

  // 2. Check cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    const payload = await verifySSOToken(cookieToken);
    if (payload) {
      return { payload };
    }
  }

  // 3. No valid token - redirect to auth login
  // Strip any stale auth_token from current URL before using as redirect target.
  // Force the public base URL so that Docker/dev hosts (0.0.0.0, localhost:3000)
  // do not leak into the redirect URL sent to the auth service.
  url.searchParams.delete('auth_token');
  const cleanUrl = cleanRedirectUrl(url.toString());
  const loginUrl = `${AUTH_SERVICE_URL}/login?redirect=${encodeURIComponent(cleanUrl)}`;
  return { redirect: NextResponse.redirect(loginUrl) };
}
