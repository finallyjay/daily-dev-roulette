import { test, expect } from "@playwright/test";

// Sign-in (src/pages/index.astro) and the server-side session gate on
// /roulette (src/pages/roulette.astro), both mocked/simulated with no real
// network calls:
//
// - POST /api/auth is a same-origin fetch made by the browser, so
//   page.route() mocks it directly — no real daily.dev token needed.
// - The /roulette redirect-when-signed-out check runs entirely server-side
//   in Astro frontmatter (currentUser() reads the `ddr_token` cookie; no
//   cookie means no network call at all — see src/lib/auth.ts). A fresh
//   Playwright context has no cookies, so the redirect is already
//   deterministic without mocking anything.

test.describe("sign-in", () => {
  test("a successful token submit redirects home", async ({ page }) => {
    await page.route("**/api/auth", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/");
    await page.locator("#token").fill("fake-token-123");
    await page.locator("#signin").click();

    // The client does `window.location.href = "/"` on success.
    await expect(page).toHaveURL("/");
    await expect(page.locator("#token")).toBeVisible(); // back on the (still signed-out) hub
  });

  test("a rejected token surfaces the error in the aria-live region", async ({ page }) => {
    await page.route("**/api/auth", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 401,
        json: { error: "Token rejected by daily.dev. Check it's valid and you have Plus." },
      });
    });

    await page.goto("/");
    await page.locator("#token").fill("fake-token-123");
    const signin = page.locator("#signin");
    await signin.click();

    const error = page.locator("#login-error");
    await expect(error).toHaveText(
      "Token rejected by daily.dev. Check it's valid and you have Plus.",
    );
    // role="alert" aria-live="assertive" — announced without a page navigation.
    await expect(error).toHaveAttribute("aria-live", "assertive");
    await expect(page).toHaveURL("/");
    await expect(signin).toBeEnabled(); // re-enabled after the failed attempt
  });

  test("submitting with no token shows a client-side error and never calls the API", async ({
    page,
  }) => {
    let called = false;
    await page.route("**/api/auth", async (route) => {
      called = true;
      await route.continue();
    });

    await page.goto("/");
    await page.locator("#signin").click();

    await expect(page.locator("#login-error")).toHaveText("Paste a token first, partner.");
    expect(called).toBe(false);
  });
});

test.describe("real mode requires a session", () => {
  test("/roulette redirects to / when signed out", async ({ page }) => {
    // No cookie in a fresh context -> currentUser() short-circuits to null
    // server-side (see src/lib/auth.ts) -> Astro.redirect("/"). Deterministic,
    // no API mocking needed: the redirect never reaches a bookmarks fetch.
    await page.goto("/roulette");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "daily.dev Roulette" })).toBeVisible();
  });

  test("/roulette?demo=1 is exempt from the redirect (no session required)", async ({ page }) => {
    await page.goto("/roulette?demo=1");

    await expect(page).toHaveURL(/\/roulette\?demo=1/);
    await expect(page.locator("#stage")).toHaveAttribute("data-mode", "demo");
  });
});
