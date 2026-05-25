import type { APIRoute } from "astro";
import { deleteBookmark } from "../../../lib/daily";
import { getToken } from "../../../lib/session";

// DELETE /api/bookmarks/:id — pulls the trigger on a real bookmark.
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const token = getToken(cookies);
  if (!token) return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401 });

  const id = params.id;
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  try {
    await deleteBookmark(token, id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[delete] ", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
