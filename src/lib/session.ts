import type { AstroCookies } from "astro";
import type { TokenSet } from "./oauth";

// The token lives only in an httpOnly cookie — unreadable from client JS.
const COOKIE = "ddr_token";
// OAuth sessions also carry a refresh token and the access token's expiry.
// Personal-token sessions have neither: those tokens don't expire mid-session.
const REFRESH_COOKIE = "ddr_refresh";
const EXPIRES_COOKIE = "ddr_expires";
// Short-lived `state` + PKCE verifier between /api/auth/login and the callback.
const OAUTH_COOKIE = "ddr_oauth";

const SESSION_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 8, // 8h — ephemeral by design; we store no user data server-side
} as const;

export function setSession(cookies: AstroCookies, token: string) {
  cookies.set(COOKIE, token, SESSION_OPTS);
}

export function setOAuthSession(cookies: AstroCookies, tokens: TokenSet) {
  setSession(cookies, tokens.access_token);
  cookies.set(EXPIRES_COOKIE, String(Date.now() + tokens.expires_in * 1000), SESSION_OPTS);
  if (tokens.refresh_token) cookies.set(REFRESH_COOKIE, tokens.refresh_token, SESSION_OPTS);
}

export function getToken(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE)?.value || undefined;
}

export function getRefreshToken(cookies: AstroCookies): string | undefined {
  return cookies.get(REFRESH_COOKIE)?.value || undefined;
}

/** True when an OAuth access token is expired or about to be (60s of slack). */
export function accessTokenExpiring(cookies: AstroCookies): boolean {
  const expires = Number(cookies.get(EXPIRES_COOKIE)?.value);
  return Number.isFinite(expires) && expires > 0 && Date.now() > expires - 60_000;
}

export function clearSession(cookies: AstroCookies) {
  for (const name of [COOKIE, REFRESH_COOKIE, EXPIRES_COOKIE]) {
    cookies.delete(name, { path: "/" });
  }
}

export function setOAuthRequest(cookies: AstroCookies, req: { state: string; verifier: string }) {
  cookies.set(OAUTH_COOKIE, JSON.stringify(req), {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax", // the callback is a top-level GET from daily.dev, so lax is sent
    path: "/api/auth",
    maxAge: 60 * 10,
  });
}

/** Reads and consumes the pending sign-in; each `state` is single-use. */
export function takeOAuthRequest(
  cookies: AstroCookies,
): { state: string; verifier: string } | undefined {
  const raw = cookies.get(OAUTH_COOKIE)?.value;
  cookies.delete(OAUTH_COOKIE, { path: "/api/auth" });
  try {
    const parsed = raw ? JSON.parse(raw) : undefined;
    return parsed?.state && parsed?.verifier ? parsed : undefined;
  } catch {
    return undefined;
  }
}
