import type { APIRoute } from "astro";
import { countBookmarks } from "../../../lib/daily";
import { getToken } from "../../../lib/session";

// GET /api/bookmarks/count?unreadOnly=true — a lightweight tally for the
// homepage "in the chamber" counter. Unlike /api/bookmarks, this hits daily.dev
// once (a single page) instead of paginating the whole pile just to count.
export const GET: APIRoute = async ({ url, cookies }) => {
  const token = getToken(cookies);
  if (!token) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  try {
    const { count, exact } = await countBookmarks(token, { unreadOnly });
    return new Response(JSON.stringify({ count, exact }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[bookmarks:count] ", err);
    return new Response(JSON.stringify({ error: "Failed to count bookmarks" }), { status: 502 });
  }
};
