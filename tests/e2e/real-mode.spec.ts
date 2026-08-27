import { test, expect, type Page } from "@playwright/test";

// Real-mode coverage: the game loading real bookmarks via GET /api/bookmarks
// and a failed DELETE surfacing "the gun jammed" (src/scripts/roulette.ts),
// plus the homepage "in the chamber" counter (GET /api/bookmarks/count).
//
// Why the document gets patched here, not just the API:
// Both features only render for a signed-in user (`profile` truthy), and
// `profile` comes from src/lib/auth.ts#currentUser(), which — from Astro's
// server-side frontmatter, NOT the browser — calls daily.dev directly
// (src/lib/daily.ts#getProfile). Astro's dev server is a separate process
// from the one Playwright's page/context runs in, so page.route() (a
// browser-network hook) cannot intercept that server-side fetch, and there's
// no test-mode override for it (see .env.example: no env vars are read).
// Signing in for real would require a live daily.dev Plus token, which we
// don't have and don't want in CI (no real network in e2e).
//
// So instead of faking a whole sign-in, each test below patches just the
// piece of server-rendered HTML that's gated behind `profile` — a
// `data-mode` attribute, or a container element the client script looks for
// — using the same demo/anonymous render Astro already serves without a
// session. The actual client code under test (initRoulette()'s fetchReal()/
// pullTrigger(), and index.astro's bm-count script) runs completely
// unmodified; only its network calls (GET/DELETE /api/bookmarks*) are
// mocked via page.route(), same as every other test in this suite.

const HIT = 0; // Math.floor(0 * 6) === 0 -> pullTrigger() always hits.
async function stubRandom(page: Page, value: number) {
  await page.addInitScript((v) => {
    Math.random = () => v;
  }, value);
}

const REAL_BOOKMARKS = [
  {
    id: "r1",
    title: "Real Bookmark One",
    url: "https://example.dev/r1",
    summary: "Fetched from the mocked /api/bookmarks.",
    source: { name: "Test Wire" },
    readTime: 4,
    bookmarkedAt: "2024-05-01T00:00:00Z",
  },
  {
    id: "r2",
    title: "Real Bookmark Two",
    url: "https://example.dev/r2",
    summary: "Also fetched from the mocked /api/bookmarks.",
    source: { name: "Test Wire" },
    readTime: 6,
    bookmarkedAt: "2024-05-02T00:00:00Z",
  },
];

/** Serve /roulette?demo=1 (no session required) but relabel the stage as real mode. */
async function loadRouletteAsReal(page: Page) {
  await page.route(
    (url) => url.pathname === "/roulette" && url.searchParams.get("demo") === "1",
    async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({ response, body: html.replace('data-mode="demo"', 'data-mode="real"') });
    },
  );
  await page.goto("/roulette?demo=1");
}

test.describe("real mode: loading bookmarks", () => {
  test.beforeEach(async ({ page }) => {
    page.context().on("page", (p) => p.close().catch(() => {}));
  });

  test("loads the real chamber from GET /api/bookmarks", async ({ page }) => {
    await page.route("**/api/bookmarks", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ json: { items: REAL_BOOKMARKS } });
    });

    await loadRouletteAsReal(page);

    await expect(page.locator("#stat-chamber")).toHaveText(String(REAL_BOOKMARKS.length));
    await expect(page.locator("#spin")).toBeVisible();
  });

  test("a fetch failure surfaces the loading error", async ({ page }) => {
    await page.route("**/api/bookmarks", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ status: 401, json: { error: "Not signed in" } });
    });

    await loadRouletteAsReal(page);

    await expect(page.locator("#loading")).toContainText("Could not load your bookmarks");
  });
});

test.describe("real mode: pulling the trigger", () => {
  test.beforeEach(async ({ page }) => {
    page.context().on("page", (p) => p.close().catch(() => {}));
    await stubRandom(page, HIT); // always a live round -> DELETE is always attempted
    await page.route("**/api/bookmarks", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({ json: { items: REAL_BOOKMARKS } });
    });
  });

  test('a failed DELETE shows "the gun jammed" and keeps the bookmark', async ({ page }) => {
    await page.route("**/api/bookmarks/*", async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      await route.fulfill({ status: 502, json: { error: "Failed to delete bookmark" } });
    });

    await loadRouletteAsReal(page);
    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });

    await page.getByRole("button", { name: /Pull the trigger/ }).click();

    const verdictMsg = page.locator("#verdict-msg");
    await expect(verdictMsg).toContainText("The gun jammed", { timeout: 5000 });
    await expect(verdictMsg).toContainText("Failed to delete bookmark");
    await expect(verdictMsg).toHaveAttribute("aria-live", "polite");

    // The chamber count is unchanged and the verdict is still live — the
    // DELETE never succeeded, so the round shouldn't have been removed.
    await expect(page.locator("#stat-chamber")).toHaveText(String(REAL_BOOKMARKS.length));
    await expect(page.getByRole("button", { name: /Pull the trigger/ })).toBeEnabled();
  });

  test("a successful DELETE removes the bookmark via the real API", async ({ page }) => {
    let deletedId: string | null = null;
    await page.route("**/api/bookmarks/*", async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      deletedId = route.request().url().split("/").pop() ?? null;
      await route.fulfill({ status: 204 });
    });

    await loadRouletteAsReal(page);
    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });

    await page.getByRole("button", { name: /Pull the trigger/ }).click();

    await expect(page.locator("#toast")).toHaveClass(/toast--kill/, { timeout: 5000 });
    await expect(page.locator("#stat-killed")).toHaveText("1");
    await expect(page.locator("#stat-chamber")).toHaveText(String(REAL_BOOKMARKS.length - 1));
    // Math.random is stubbed to 0, so spin()/pullTrigger() deterministically
    // pick chamber[0] — the first mocked bookmark.
    expect(deletedId).toBe(REAL_BOOKMARKS[0].id);
  });
});

// #bm-count only renders for a signed-in profile; inject the bare element the
// anonymous render omits so the real, unmodified counter script (index.astro's
// inline <script>, which always looks up #bm-count and runs regardless of
// profile) has something to populate. See the file header.
async function loadHomeWithCounterSlot(page: Page) {
  await page.route(
    (url) => url.pathname === "/",
    async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace("<body>", '<body><b id="bm-count" hidden></b>'),
      });
    },
  );
  await page.goto("/");
}

test.describe("homepage bookmark counter (bm-count)", () => {
  test("shows the exact count when the API reports one", async ({ page }) => {
    await page.route("**/api/bookmarks/count", async (route) => {
      await route.fulfill({ json: { count: 7, exact: true } });
    });

    await loadHomeWithCounterSlot(page);

    await expect(page.locator("#bm-count")).toHaveText("7");
  });

  test('shows "N+" when the count is an inexact first-page tally', async ({ page }) => {
    await page.route("**/api/bookmarks/count", async (route) => {
      await route.fulfill({ json: { count: 50, exact: false } });
    });

    await loadHomeWithCounterSlot(page);

    await expect(page.locator("#bm-count")).toHaveText("50+");
  });

  test("shows a fallback when the count endpoint returns an error response", async ({ page }) => {
    // The real user-visible failure mode: /api/bookmarks/count returning a
    // non-OK response with a valid JSON error body (see
    // src/pages/api/bookmarks/count.ts), not just a transport-level failure.
    await page.route("**/api/bookmarks/count", async (route) => {
      await route.fulfill({ status: 502, json: { error: "Failed to count bookmarks" } });
    });

    await loadHomeWithCounterSlot(page);

    await expect(page.locator("#bm-count")).toHaveText("?");
  });

  test("shows a fallback when the count fetch itself fails", async ({ page }) => {
    await page.route("**/api/bookmarks/count", async (route) => {
      await route.abort("failed");
    });

    await loadHomeWithCounterSlot(page);

    await expect(page.locator("#bm-count")).toHaveText("?");
  });
});
