import type { AstroCookies } from "astro";

// The token lives only in an httpOnly cookie — unreadable from client JS.
const COOKIE = "ddr_token";

export function setSession(cookies: AstroCookies, token: string) {
  cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h — ephemeral by design; we store no user data server-side
  });
}

export function getToken(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE)?.value || undefined;
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: "/" });
}
