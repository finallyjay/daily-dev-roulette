import type { APIRoute } from "astro";
import { listBookmarks } from "../../../lib/daily";
import { getToken } from "../../../lib/session";

// GET /api/bookmarks?cursor=…&unreadOnly=true — one page (50) of the user's
// real bookmarks, newest first. One daily.dev request per call: free accounts
// get a small monthly API quota, so the client walks the pile page by page
// instead of loading it all up front.
export const GET: APIRoute = async ({ url, cookies }) => {
  const token = getToken(cookies);
  if (!token) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const cursor = url.searchParams.get("cursor") || undefined;
  try {
    const page = await listBookmarks(token, { unreadOnly, cursor });
    return new Response(JSON.stringify(page), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[bookmarks:list] ", err);
    return new Response(JSON.stringify({ error: "Failed to load bookmarks" }), { status: 502 });
  }
};
