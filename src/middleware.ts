import { defineMiddleware } from "astro:middleware";
import { refreshTokens } from "./lib/oauth";
import { accessTokenExpiring, clearSession, getRefreshToken, setOAuthSession } from "./lib/session";

// OAuth access tokens are short-lived. Refreshing here, once per request and
// before any page or /api route runs, lets everything downstream keep reading
// the token with a plain getToken(): Astro's cookies.get() returns values set
// earlier in the same request.
export const onRequest = defineMiddleware(async ({ cookies }, next) => {
  const refreshToken = getRefreshToken(cookies);
  if (refreshToken && accessTokenExpiring(cookies)) {
    try {
      setOAuthSession(cookies, await refreshTokens(refreshToken));
    } catch (err) {
      // Expired or revoked refresh token: the docs say to restart sign-in.
      console.error("[auth:refresh] ", err);
      clearSession(cookies);
    }
  }
  return next();
});
