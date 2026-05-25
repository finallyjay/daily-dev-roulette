import type { APIRoute } from "astro";
import { listAllBookmarks } from "../../../lib/daily";
import { getToken } from "../../../lib/session";

// GET /api/bookmarks?unreadOnly=true — proxies the user's real bookmarks (all pages).
export const GET: APIRoute = async ({ url, cookies }) => {
  const token = getToken(cookies);
  if (!token) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  try {
    const items = await listAllBookmarks(token, { unreadOnly });
    return new Response(JSON.stringify({ items }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
