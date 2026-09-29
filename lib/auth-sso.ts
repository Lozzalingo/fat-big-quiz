/**
 * Lozzalingo SSO auth client for Next.js apps.
 *
 * Validates JWTs from auth.laurence.computer using HS256.
 * Works in Next.js middleware (Edge Runtime compatible).
 *
 * Usage in middleware.ts:
 *   import { verifySSOToken, handleSSOAuth } from './lib/auth-sso';
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://auth.laurence.computer';

interface SSOPayload {
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
 * Verify an HS256 JWT using the Web Crypto API (Edge Runtime compatible).
 * Returns the payload or null if invalid/expired.
 */
export async function verifySSOToken(token: string): Promise<SSOPayload | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify header
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    if (header.alg !== 'HS256') return null;

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, sigInput);
    if (!valid) return null;

    // Decode payload
    const payload: SSOPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Handle SSO auth for admin routes in Next.js middleware.
 *
 * 1. Checks for auth_token query param (cross-domain SSO) - sets cookie and strips param
 * 2. Checks for auth_token cookie - validates JWT
 *
 * Returns:
 * - { authenticated: true } if SSO token is valid
 * - { redirect: NextResponse } if a redirect is needed (cookie set from query param)
 * - { authenticated: false } if no valid SSO token found
 */
export async function handleSSOAuth(
  request: import('next/server').NextRequest,
  NextResponse: typeof import('next/server').NextResponse
): Promise<
  | { authenticated: true; email: string }
  | { authenticated: false }
  | { redirect: import('next/server').NextResponse }
> {
  const url = request.nextUrl.clone();

  // 1. Check for auth_token in query params (cross-domain redirect from auth service)
  const tokenFromUrl = url.searchParams.get('auth_token');
  if (tokenFromUrl) {
    const payload = await verifySSOToken(tokenFromUrl);
    if (payload && payload.is_super_admin) {
      // Strip token from URL and set cookie
      url.searchParams.delete('auth_token');
      const response = NextResponse.redirect(url);
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

  // 2. Check for auth_token cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    const payload = await verifySSOToken(cookieToken);
    if (payload && payload.is_super_admin) {
      return { authenticated: true, email: payload.email };
    }
  }

  // 3. No valid SSO token
  return { authenticated: false };
}

/**
 * Build a redirect URL to the SSO login page.
 */
export function ssoLoginRedirect(currentUrl: string): string {
  return `${AUTH_SERVICE_URL}/login?redirect=${encodeURIComponent(currentUrl)}`;
}
