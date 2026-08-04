// Thin server-side client for the daily.dev Public API.
// Only ever called from /api routes — the token never reaches the browser.
const BASE = "https://api.daily.dev/public/v1";

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  image?: string;
  summary?: string;
  source?: { name?: string; image?: string };
  readTime?: number;
  bookmarkedAt?: string;
};

// Only the auth header by default. Setting Content-Type: application/json without a
// body makes daily.dev's Fastify backend reject the request ("Body cannot be empty").
export type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  isPlus?: boolean;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Current user's profile (name + avatar for the header). */
export async function getProfile(token: string): Promise<Profile> {
  const res = await fetch(`${BASE}/profile/`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`getProfile failed: ${res.status}`);
  return (await res.json()) as Profile;
}

function jsonHeaders(token: string) {
  return { ...authHeaders(token), "Content-Type": "application/json" };
}

/** Validates a token by making one cheap authenticated call. Returns true if accepted. */
export async function validateToken(token: string): Promise<boolean> {
  const url = new URL(`${BASE}/bookmarks/`);
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: authHeaders(token) });
  return res.ok;
}

// Response shape per OpenAPI: { data: BookmarkedPost[], pagination: { cursor, hasNextPage } }
// `total` is read defensively: the current API does not document it, but if a
// future version returns it we can report an exact count from a single page.
type BookmarksPage = {
  data: Bookmark[];
  pagination?: { cursor?: string | null; hasNextPage?: boolean; total?: number };
  total?: number;
};

/**
 * Cheap chamber tally for the homepage. Fetches a single page instead of
 * paginating the whole pile (which `listAllBookmarks` would do just to count).
 * Returns an exact count when the API exposes a total or the pile fits in one
 * page; otherwise `exact` is false and the count is the first-page size, which
 * the UI renders as "N+".
 */
export async function countBookmarks(
  token: string,
  opts: { unreadOnly?: boolean } = {},
): Promise<{ count: number; exact: boolean }> {
  const url = new URL(`${BASE}/bookmarks/`);
  url.searchParams.set("limit", "50");
  if (opts.unreadOnly) url.searchParams.set("unreadOnly", "true");

  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`countBookmarks failed: ${res.status}`);

  const body = (await res.json()) as BookmarksPage;
  const total = body.pagination?.total ?? body.total;
  if (typeof total === "number") return { count: total, exact: true };

  const items = body.data ?? [];
  return { count: items.length, exact: !(body.pagination?.hasNextPage ?? false) };
}

/** Fetches one page (max 50). `unreadOnly` targets the dead-weight pile we want to cull. */
export async function listBookmarks(
  token: string,
  opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = {},
): Promise<{ items: Bookmark[]; cursor?: string; hasNextPage: boolean }> {
  const url = new URL(`${BASE}/bookmarks/`);
  url.searchParams.set("limit", String(opts.limit ?? 50));
  if (opts.unreadOnly) url.searchParams.set("unreadOnly", "true");
  if (opts.cursor) url.searchParams.set("cursor", opts.cursor);

  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`listBookmarks failed: ${res.status}`);

  const body = (await res.json()) as BookmarksPage;
  return {
    items: body.data ?? [],
    cursor: body.pagination?.cursor ?? undefined,
    hasNextPage: body.pagination?.hasNextPage ?? false,
  };
}

/** Follows the cursor to pull every bookmark (capped to avoid runaway). */
export async function listAllBookmarks(
  token: string,
  opts: { unreadOnly?: boolean; maxItems?: number } = {},
): Promise<Bookmark[]> {
  const cap = opts.maxItems ?? 1000;
  const all: Bookmark[] = [];
  let cursor: string | undefined;

  do {
    const page = await listBookmarks(token, { unreadOnly: opts.unreadOnly, limit: 50, cursor });
    all.push(...page.items);
    cursor = page.hasNextPage ? page.cursor : undefined;
  } while (cursor && all.length < cap);

  return all.slice(0, cap);
}

/** Pulls the trigger: permanently removes a bookmark. 204 on success. */
export async function deleteBookmark(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/bookmarks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`daily.dev DELETE /bookmarks/${id} -> ${res.status} ${res.statusText} ${body}`);
  }
}

/** Spares it into a list (e.g. a "Survivors" / "Read Next" folder). null removes from list. */
export async function moveBookmark(
  token: string,
  id: string,
  listId: string | null,
): Promise<void> {
  const res = await fetch(`${BASE}/bookmarks/${id}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ listId }),
  });
  if (!res.ok) throw new Error(`moveBookmark failed: ${res.status}`);
}
