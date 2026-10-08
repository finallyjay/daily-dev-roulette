import type { APIRoute } from "astro";
import { authorizeUrl, newAuthRequest, oauthEnabled, redirectUri } from "../../../lib/oauth";
import { setOAuthRequest } from "../../../lib/session";

// GET /api/auth/login -> off to daily.dev's consent screen.
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (!oauthEnabled()) return redirect("/?login=unavailable");

  const { state, verifier, challenge } = await newAuthRequest();
  setOAuthRequest(cookies, { state, verifier });
  return redirect(authorizeUrl({ redirectUri: redirectUri(url), state, challenge }));
};
