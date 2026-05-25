import type { AstroCookies } from "astro";

// The token lives only in an httpOnly cookie — unreadable from client JS.
const COOKIE = "ddr_token";
const DEMO_COOKIE = "ddr_demo";

export function setSession(cookies: AstroCookies, token: string, isDemo = false) {
  cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h — ephemeral by design; we store no user data server-side
  });
  cookies.set(DEMO_COOKIE, isDemo ? "1" : "", {
    httpOnly: false, // UI may show a "demo mode" banner
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function getToken(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE)?.value || undefined;
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: "/" });
  cookies.delete(DEMO_COOKIE, { path: "/" });
}
