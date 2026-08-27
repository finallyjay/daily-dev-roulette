import type { APIRoute } from "astro";
import { validateToken } from "../../lib/daily";
import { setSession, clearSession } from "../../lib/session";

// POST { token } -> sign in with a personal token.
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const token: string | undefined = body.token?.trim();

  if (!token) {
    return json({ error: "No token provided." }, 400);
  }

  const ok = await validateToken(token);
  if (!ok) {
    return json({ error: "Token rejected by daily.dev. Check it's valid and you have Plus." }, 401);
  }

  setSession(cookies, token);
  return json({ ok: true });
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
