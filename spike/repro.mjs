// Headless smoke test of the multi-page demo flow.
import { chromium } from "playwright";

const ORIGIN = "http://localhost:4321";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const cls = (sel) => page.locator(sel).getAttribute("class");

// 1. Home, logged out
await page.goto(ORIGIN + "/");
console.log("home shows rules:", (await page.content()).includes("The rules"));
console.log("home shows demo button:", await page.locator("a[href='/roulette?demo=1']").count() > 0);
console.log("header shows 'not signed in':", (await page.content()).includes("not signed in"));

// 2. Into the roulette (demo)
await page.goto(ORIGIN + "/roulette?demo=1");
await page.waitForTimeout(400);
console.log("\nloading hidden:", (await cls("#loading")).includes("hidden"));
console.log("spin visible:", !(await cls("#spin")).includes("hidden"));
console.log("chamber count:", await page.textContent("#stat-chamber"));

// 3. Spin, then refresh mid-decision -> same card restored
await page.click("#spin");
await page.waitForTimeout(1300);
const before = await page.textContent("#card-title");
console.log("\ncard before refresh:", JSON.stringify(before));
await page.reload();
await page.waitForTimeout(400);
const after = await page.textContent("#card-title");
console.log("verdict visible after reload:", !(await cls("#verdict")).includes("hidden"));
console.log("same card restored:", before === after ? "YES ✅" : "NO ❌");

// 4. Decide, then back-to-home link present
await page.click("#read");
await page.waitForTimeout(1600);
console.log("\nsurvived:", await page.textContent("#stat-survived"));
console.log("back-home link:", await page.locator("a[href='/']").count() > 0);

await browser.close();
