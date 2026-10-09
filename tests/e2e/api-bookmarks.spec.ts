import { test, expect } from "@playwright/test";

// DELETE /api/bookmarks/:id must only ever delete a bookmark (issue #74): an
// id that smuggles a path (`lists%2F<id>`, `..%2Ffeeds%2F...`) is refused
// before anything is sent to daily.dev. A placeholder token is enough, since
// the id check runs first and these requests never leave the dev server.
test.describe("DELETE /api/bookmarks/:id", () => {
  for (const id of ["lists%2Fabc123", "..%2Ffeeds%2Fcustom%2Fabc123", "abc%3Fx%3D1", "abc.def"]) {
    test(`rejects ${id}`, async ({ request, baseURL }) => {
      const res = await request.delete(`/api/bookmarks/${id}`, {
        // Same-origin, as the browser sends it; Astro's checkOrigin 403s otherwise.
        headers: { cookie: "ddr_token=placeholder", origin: new URL(baseURL!).origin },
      });
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid bookmark id" });
    });
  }
});
