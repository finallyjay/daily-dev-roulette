import type { APIRoute } from "astro";
import { validateToken } from "../../lib/daily";
import { setSession, clearSession } from "../../lib/session";

// POST { token } -> sign in with a personal token.
// POST { demo: true } -> sign in with the server's DAILY_TOKEN (the "Try demo" button).
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  let token: string | undefined = body.token?.trim();
  const isDemo = body.demo === true;

  if (isDemo) {
    token = import.meta.env.DAILY_TOKEN || process.env.DAILY_TOKEN;
    if (!token) {
      return json({ error: "Demo mode is not configured on this deployment." }, 503);
    }
  }

  if (!token) {
    return json({ error: "No token provided." }, 400);
  }

  const ok = await validateToken(token);
  if (!ok) {
    return json({ error: "Token rejected by daily.dev. Check it's valid and you have Plus." }, 401);
  }

  setSession(cookies, token, isDemo);
  return json({ ok: true, demo: isDemo });
};

// Sign out — clears the cookie.
export const DELETE: APIRoute = async ({ cookies }) => {
  clearSession(cookies);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
