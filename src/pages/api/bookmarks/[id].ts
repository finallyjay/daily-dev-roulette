import type { APIRoute } from "astro";
import { DailyApiError, deleteBookmark } from "../../../lib/daily";
import { getToken } from "../../../lib/session";

// DELETE /api/bookmarks/:id — pulls the trigger on a real bookmark.
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const token = getToken(cookies);
  if (!token) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

  // daily.dev post ids are short slugs; anything else (e.g. a decoded
  // `lists/<id>`) is refused rather than forwarded to another endpoint.
  const id = params.id;
  if (!id || !/^[\w-]+$/.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid bookmark id" }), { status: 400 });
  }

  try {
    await deleteBookmark(token, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    // OAuth users can untick `write` on daily.dev's consent screen.
    if (err instanceof DailyApiError && err.status === 403) {
      return new Response(
        JSON.stringify({
          error: "daily.dev didn't give us write access. Sign out and sign in again allowing it.",
        }),
        { status: 403 },
      );
    }
    console.error("[delete] ", err);
    return new Response(JSON.stringify({ error: "Failed to delete bookmark" }), { status: 502 });
  }
};
