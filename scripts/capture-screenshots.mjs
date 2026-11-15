import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../web/package.json"));
const { chromium } = require("playwright-core");

const defaultOut = "/Users/mac/Development/indonesian-token-tax/web/screenshots";
const outDir = process.argv[2] ? resolve(process.argv[2]) : defaultOut;
const previewPort = process.env.PREVIEW_PORT ?? "4173";
const previewOrigin = `http://127.0.0.1:${previewPort}`;
mkdirSync(outDir, { recursive: true });

const chrome =
  "/Users/mac/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const shots = [
  { w: 375, where: "top", theme: "light", run: false },
  { w: 1280, where: "top", theme: "light", run: false },
  { w: 375, where: "top", theme: "dark", run: false },
  { w: 1280, where: "top", theme: "dark", run: false },
  { w: 375, where: "try", theme: "light", run: true },
  { w: 1280, where: "try", theme: "light", run: true },
  { w: 375, where: "try", theme: "dark", run: true },
  { w: 1280, where: "try", theme: "dark", run: true },
];

const browser = await chromium.launch({ executablePath: chrome, headless: true });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: 900 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const q = new URLSearchParams();
  if (s.run) q.set("run", "1");
  q.set("theme", s.theme);
  await page.goto(`${previewOrigin}/?${q}`, { waitUntil: "networkidle", timeout: 60000 });
  if (s.where === "try" && !s.run) {
    await page.locator("#try").scrollIntoViewIfNeeded();
  }
  if (s.run) {
    await page.waitForFunction(
      () => document.querySelectorAll("#try-details .status.ok").length === 7,
      { timeout: 120000 },
    );
  } else if (s.where === "top") {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (s.w === 375 && s.where === "top") {
  await page.locator("#board-chart .chart-wrap.chart-mobile").waitFor({ state: "visible", timeout: 15000 });
    const mobileW = await page.locator("#board-chart .chart-mobile-svg").boundingBox();
    if (!mobileW || mobileW.width < 300) {
      throw new Error(`375 mobile chart too narrow (${mobileW?.width ?? 0}px)`);
    }
  }
  const name = `redesign2-${s.w}-${s.theme}-${s.where}.png`;
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
  console.log("wrote", name);
  await page.close();
}
// EN chart check at 375
const pageEn = await browser.newPage({ viewport: { width: 375, height: 900 } });
await pageEn.emulateMedia({ reducedMotion: "reduce" });
await pageEn.goto(`${previewOrigin}/?theme=light`, { waitUntil: "networkidle", timeout: 60000 });
await pageEn.evaluate(() => {
  localStorage.setItem("itt-lang", "en");
  document.documentElement.lang = "en";
});
await pageEn.reload({ waitUntil: "networkidle" });
await pageEn.locator("#board-chart .chart-wrap.chart-mobile").waitFor({ state: "visible" });
await pageEn.locator(".chart-wrap.chart-desktop").waitFor({ state: "hidden" });
console.log("ok 375 mobile chart EN");
await pageEn.close();

await browser.close();