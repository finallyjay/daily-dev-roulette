import type { APIRoute } from "astro";
import { validateToken } from "../../../lib/daily";
import { oauthEnabled, revokeRefreshToken } from "../../../lib/oauth";
import { setSession, clearSession, getRefreshToken } from "../../../lib/session";

// POST { token } -> sign in with a personal token. Local dev only: OAuth can't
// complete on localhost, and the deployed app never accepts personal tokens.
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!import.meta.env.DEV) return json({ error: "Not found" }, 404);
  const body = await request.json().catch(() => ({}));
  const token: string | undefined = body.token?.trim();

  if (!token) {
    return json({ error: "No token provided." }, 400);
  }

  const ok = await validateToken(token);
  if (!ok) {
    return json({ error: "Token rejected by daily.dev. Check it's valid and not expired." }, 401);
  }

  setSession(cookies, token);
  return json({ ok: true });
};

// Sign out — revokes an OAuth refresh token (if any) and clears the cookies.
export const DELETE: APIRoute = async ({ cookies }) => {
  const refreshToken = getRefreshToken(cookies);
  if (refreshToken && oauthEnabled()) await revokeRefreshToken(refreshToken);
  clearSession(cookies);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
