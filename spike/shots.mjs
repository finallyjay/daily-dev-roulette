// Throwaway visual-diff helper for the Tailwind migration branch.
// Usage: node spike/shots.mjs <label>   e.g. `node spike/shots.mjs before`
import { chromium } from "playwright";

const label = process.argv[2] || "shot";
const base = "http://localhost:4321";
const pages = [
  { name: "index", url: "/" },
  { name: "roulette", url: "/roulette?demo=1" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 700, height: 1100 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce", // freeze entrance/spin animations for stable diffs
});
const page = await ctx.newPage();
for (const p of pages) {
  await page.goto(base + p.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/ddr-${p.name}-${label}.png`, fullPage: true });
  console.log(`saved /tmp/ddr-${p.name}-${label}.png`);
}
await browser.close();
