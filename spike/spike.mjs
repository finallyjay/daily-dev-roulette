// Throwaway API spike for daily.dev Public API.
// Verifies auth + the bookmark endpoints we need before building the app.
//
// Usage:
//   DAILY_TOKEN=xxx node spike/spike.mjs              # read-only: list bookmarks
//   DAILY_TOKEN=xxx node spike/spike.mjs --unread     # only unread bookmarks
//   DAILY_TOKEN=xxx node spike/spike.mjs --delete ID  # DANGER: really deletes bookmark ID
//
// Token comes from the env var so it never lands in shell history files or git.
// Generate one at daily.dev > Settings > API (requires Plus).

const BASE = "https://api.daily.dev/public/v1";
const token = process.env.DAILY_TOKEN;

if (!token) {
  console.error("Missing DAILY_TOKEN env var. Run: DAILY_TOKEN=xxx node spike/spike.mjs");
  process.exit(1);
}

const args = process.argv.slice(2);
const unreadOnly = args.includes("--unread");
const deleteIdx = args.indexOf("--delete");
const deleteId = deleteIdx !== -1 ? args[deleteIdx + 1] : null;

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function listBookmarks() {
  const url = new URL(`${BASE}/bookmarks/`);
  url.searchParams.set("limit", "10");
  if (unreadOnly) url.searchParams.set("unreadOnly", "true");

  console.log(`GET ${url}`);
  const res = await fetch(url, { headers });
  console.log(`Status: ${res.status} ${res.statusText}`);

  // CORS-relevant headers tell us if a browser-only flow is possible.
  console.log("access-control-allow-origin:", res.headers.get("access-control-allow-origin") ?? "(none)");

  if (!res.ok) {
    console.error("Body:", await res.text());
    return;
  }

  const data = await res.json();
  const items = Array.isArray(data) ? data : data.bookmarks ?? data.data ?? [];
  console.log(`\nGot ${items.length} bookmark(s). Sample:`);
  for (const b of items.slice(0, 5)) {
    console.log(`  - [${b.id}] ${b.title ?? "(no title)"}  | bookmarkedAt=${b.bookmarkedAt ?? "?"}`);
  }
  console.log("\nFull shape of first item keys:", items[0] ? Object.keys(items[0]) : "(none)");
}

async function deleteBookmark(id) {
  console.log(`\n!! DELETE ${BASE}/bookmarks/${id}`);
  const res = await fetch(`${BASE}/bookmarks/${id}`, { method: "DELETE", headers });
  console.log(`Status: ${res.status} ${res.statusText}`);
  if (!res.ok) console.error("Body:", await res.text());
  else console.log("Deleted (204 expected).");
}

if (deleteId) {
  await deleteBookmark(deleteId);
} else {
  await listBookmarks();
}
