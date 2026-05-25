// Verify toast + sounds + mute (demo mode). Audio can't be heard headless,
// but we confirm no errors are thrown and the toasts/flow render.
import { chromium } from "playwright";

const ORIGIN = "http://localhost:4321";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function freshRoulette() {
  await page.goto(ORIGIN + "/roulette?demo=1");
  await page.evaluate(() => localStorage.removeItem("ddr_progress"));
  await page.reload();
  await page.waitForTimeout(400);
}

// MISS toast
await freshRoulette();
await page.evaluate(() => { Math.random = () => 0.5; }); // floor(0.5*6)=3 != 0 -> miss
await page.click("#spin");
await page.waitForTimeout(2350);
await page.click("#kill");
await page.waitForTimeout(450);
console.log("miss toast text:", JSON.stringify(await page.textContent("#toast")));
console.log("miss toast classes:", await page.getAttribute("#toast", "class"));
await page.screenshot({ path: "spike/shot-toast-miss.png" });

// HIT toast
await freshRoulette();
await page.evaluate(() => { Math.random = () => 0; }); // -> hit
await page.click("#spin");
await page.waitForTimeout(2350);
await page.click("#kill");
await page.waitForTimeout(450);
console.log("hit toast text:", JSON.stringify(await page.textContent("#toast")));
console.log("hit toast classes:", await page.getAttribute("#toast", "class"));
await page.screenshot({ path: "spike/shot-toast-hit.png" });

// MUTE toggle
const m0 = await page.textContent("#mute");
await page.click("#mute");
const m1 = await page.textContent("#mute");
console.log("mute toggle:", m0, "->", m1, m0 !== m1 ? "✅" : "❌");

console.log("page errors:", errors.length ? errors : "none ✅");
await browser.close();
