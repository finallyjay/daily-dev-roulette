import { test, expect } from "@playwright/test";

test.describe("home / hub", () => {
  test("renders the hub with the Bookmarks Roulette mode and a demo CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/daily\.dev Roulette/);
    await expect(page.getByRole("heading", { name: "daily.dev Roulette" })).toBeVisible();

    // The (currently only) roulette mode is advertised on the hub.
    await expect(page.getByText("Bookmarks Roulette")).toBeVisible();

    // Logged-out visitors get a token sign-in panel and a demo entry point.
    await expect(page.locator("#token")).toBeVisible();
    const demo = page.getByRole("button", { name: /Demo/ });
    await expect(demo).toBeVisible();
  });

  test("the demo button links to the demo roulette", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Demo/ }).click();
    await expect(page).toHaveURL(/\/roulette\?demo=1/);
    await expect(page.getByRole("heading", { name: "Bookmarks Roulette" })).toBeVisible();
  });
});
