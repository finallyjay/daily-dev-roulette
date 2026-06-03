import { test, expect } from "@playwright/test";

// The demo runs fully client-side on a fixed pile of 12 mock bookmarks
// (see src/lib/mock.ts), so no token, network, or Plus account is needed.
const MOCK_COUNT = 12;

test.describe("demo roulette", () => {
  test.beforeEach(async ({ page }) => {
    // Defensively close the "read it" popup that window.open() spawns.
    page.context().on("page", (p) => p.close().catch(() => {}));
    await page.goto("/roulette?demo=1");
  });

  test("loads with a full chamber and a spin button", async ({ page }) => {
    await expect(page.locator("#stat-chamber")).toHaveText(String(MOCK_COUNT));
    await expect(page.locator("#stat-killed")).toHaveText("0");
    await expect(page.locator("#stat-survived")).toHaveText("0");
    await expect(page.locator("#spin")).toBeVisible();
  });

  test("spinning reveals a WANTED verdict for a bookmark", async ({ page }) => {
    await page.locator("#spin").click();

    // The spin animation resolves after ~2.2s, then the poster slams in.
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });
    await expect(page.locator("#poster")).toContainText("WANTED");
    await expect(page.locator("#card-title")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: /Spare it/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pull the trigger/ })).toBeVisible();
  });

  test("sparing a bookmark pardons it and shrinks the chamber", async ({ page }) => {
    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });

    await page.getByRole("button", { name: /Spare it/ }).click();

    // Sparing increments the "pardoned" tally and removes the bookmark.
    await expect(page.locator("#stat-survived")).toHaveText("1");
    await expect(page.locator("#stat-chamber")).toHaveText(String(MOCK_COUNT - 1));

    // After a short beat the verdict clears and the spin button returns.
    await expect(page.locator("#spin")).toBeVisible({ timeout: 4000 });
  });
});
