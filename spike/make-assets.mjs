// Generates raster assets from HTML: og-image.png (1200x630) + apple-touch-icon.png (180).
// Run: node spike/make-assets.mjs  (writes into public/)
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const cylinderSvg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();

// --- Open Graph card (1200 x 630) ---
const ogHtml = `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rye&family=Special+Elite&display=swap" rel="stylesheet">
<style>
  * { margin:0; box-sizing:border-box; }
  body {
    width:1200px; height:630px; overflow:hidden;
    background: radial-gradient(ellipse 120% 90% at 50% -10%, #3a2812, #1c1208 50%, #0d0805);
    color:#e9dcbe; font-family:'Special Elite',monospace;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    position:relative;
  }
  .grain { position:absolute; inset:0; opacity:0.07;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .vig { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.55)); }
  .kicker { letter-spacing:0.4em; font-size:22px; color:#bb8a32; margin-bottom:18px; z-index:2; }
  .cyl { width:150px; height:150px; z-index:2; margin-bottom:26px; filter:drop-shadow(0 8px 20px rgba(0,0,0,0.6)); }
  h1 { font-family:'Rye',serif; font-size:96px; color:#e0b85a; text-shadow:3px 3px 0 #000; z-index:2; line-height:1; text-align:center; }
  .sub { font-size:30px; color:#d8c7a3; margin-top:24px; z-index:2; }
  .sub b { color:#c1272d; }
</style></head>
<body>
  <div class="grain"></div><div class="vig"></div>
  <div class="kicker">★ ★ ★&nbsp;&nbsp;WANTED&nbsp;&nbsp;★ ★ ★</div>
  <div class="cyl">${cylinderSvg.replace('width="64" height="64"', 'width="150" height="150"')}</div>
  <h1>daily.dev Roulette</h1>
  <div class="sub">Read it&hellip; or <b>pull the trigger.</b></div>
</body></html>`;

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(ogHtml, { waitUntil: "networkidle" });
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(300);
await og.screenshot({ path: "public/og-image.png" });
console.log("wrote public/og-image.png");

// --- apple-touch-icon (180) — the favicon on a filled tile ---
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(`<!doctype html><html><body style="margin:0">
  <div style="width:180px;height:180px">${cylinderSvg.replace('width="64" height="64"', 'width="180" height="180"')}</div>
</body></html>`);
await icon.screenshot({ path: "public/apple-touch-icon.png" });
console.log("wrote public/apple-touch-icon.png");

await browser.close();
