import { test, expect } from "@playwright/test";

// The core of the game — "pull the trigger" — gambles on Math.random:
//   const hit = Math.floor(Math.random() * 6) === 0;
// A flaky random makes this untestable, so (following spike/repro.mjs) we
// stub Math.random to a constant. addInitScript installs the stub BEFORE the
// game script runs on every navigation/reload, so both spin() and
// pullTrigger() are fully deterministic without touching production code:
//   0    -> floor(0 * 6)   === 0 -> HIT
//   0.5  -> floor(0.5 * 6) === 3 -> MISS (dodged)
const HIT = 0;
const MISS = 0.5;
const MOCK_COUNT = 12;

/** Freeze Math.random to `value` for the whole page lifetime (incl. reloads). */
async function stubRandom(page: import("@playwright/test").Page, value: number) {
  await page.addInitScript((v) => {
    Math.random = () => v;
  }, value);
}

test.describe("roulette core: pull the trigger", () => {
  test.beforeEach(async ({ page }) => {
    // Defensively close any popup window.open() may spawn.
    page.context().on("page", (p) => p.close().catch(() => {}));
  });

  test("HIT: the outlaw is buried (killed tally rises, chamber shrinks)", async ({ page }) => {
    await stubRandom(page, HIT);
    await page.goto("/roulette?demo=1");

    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });

    await page.getByRole("button", { name: /Pull the trigger/ }).click();

    // BANG: a live round — buried +1, one bookmark leaves the chamber.
    await expect(page.locator("#toast")).toHaveClass(/toast--kill/, { timeout: 5000 });
    await expect(page.locator("#toast")).toContainText("Bang");
    await expect(page.locator("#stat-killed")).toHaveText("1");
    await expect(page.locator("#stat-survived")).toHaveText("0");
    await expect(page.locator("#stat-chamber")).toHaveText(String(MOCK_COUNT - 1));
  });

  test("MISS: empty chamber — it dodges the bullet (survived tally rises)", async ({ page }) => {
    await stubRandom(page, MISS);
    await page.goto("/roulette?demo=1");

    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });

    await page.getByRole("button", { name: /Pull the trigger/ }).click();

    // *click* — dodged: pardoned +1 (survived), one bookmark leaves the chamber.
    await expect(page.locator("#toast")).toHaveClass(/toast--miss/, { timeout: 5000 });
    await expect(page.locator("#toast")).toContainText("Click");
    await expect(page.locator("#stat-survived")).toHaveText("1");
    await expect(page.locator("#stat-killed")).toHaveText("0");
    await expect(page.locator("#stat-chamber")).toHaveText(String(MOCK_COUNT - 1));
  });
});

test.describe("roulette core: game over & restart", () => {
  test("emptying the chamber ends the run, and restart deals a fresh pile", async ({ page }) => {
    await stubRandom(page, MISS);
    await page.goto("/roulette?demo=1");

    // Seed a run down to its last outlaw, with a verdict already on the table,
    // then reload so the game resumes from it — one trigger pull ends the run.
    await page.evaluate(() => {
      const last = {
        id: "m1",
        title: "You Probably Don't Need useEffect",
        url: "https://example.dev/no-useeffect",
        summary: "Last one standing.",
        source: { name: "React Patterns Weekly" },
        readTime: 12,
        bookmarkedAt: "2023-08-14T10:00:00Z",
      };
      localStorage.setItem(
        "ddr_progress",
        JSON.stringify({
          mode: "demo",
          chamber: [last],
          current: last,
          killed: 3,
          survived: 1,
          total: 5,
        }),
      );
    });
    await page.reload();

    // Resumed straight into the pending verdict (no spin needed).
    await expect(page.locator("#verdict")).toBeVisible();
    await page.getByRole("button", { name: /Pull the trigger/ }).click();

    // Chamber now empty -> the dust settles, tallies carried through.
    await expect(page.locator("#over")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#over-total")).toHaveText("5");
    await expect(page.locator("#over-killed")).toHaveText("3");
    await expect(page.locator("#over-survived")).toHaveText("2"); // 1 + this dodge

    // Progress is cleared on game over.
    const cleared = await page.evaluate(() => localStorage.getItem("ddr_progress"));
    expect(cleared).toBeNull();

    // Restart deals a fresh full pile in demo mode.
    await page.getByRole("button", { name: /Reload & ride again/ }).click();
    await expect(page.locator("#over")).toBeHidden();
    await expect(page.locator("#spin")).toBeVisible();
    await expect(page.locator("#stat-chamber")).toHaveText(String(MOCK_COUNT));
    await expect(page.locator("#stat-killed")).toHaveText("0");
  });
});

test.describe("roulette core: persistence", () => {
  test("reloading with a pending verdict resumes the standoff", async ({ page }) => {
    await stubRandom(page, HIT);
    await page.goto("/roulette?demo=1");

    // Spin to put a WANTED verdict on the table; the game persists it to
    // localStorage under ddr_progress.
    await page.locator("#spin").click();
    await expect(page.locator("#verdict")).toBeVisible({ timeout: 8000 });
    const title = await page.locator("#card-title").textContent();
    expect(title).toBeTruthy();

    const saved = await page.evaluate(() => localStorage.getItem("ddr_progress"));
    expect(saved).toContain('"current"'); // the pending verdict is persisted
    expect(saved).toContain(String(title));

    // Reload: the pending verdict is restored, not re-spun.
    await page.reload();
    await expect(page.locator("#verdict")).toBeVisible();
    await expect(page.locator("#card-title")).toHaveText(String(title));
    await expect(page.locator("#spin")).toBeHidden();
    await expect(page.getByRole("button", { name: /Pull the trigger/ })).toBeVisible();
  });
});
