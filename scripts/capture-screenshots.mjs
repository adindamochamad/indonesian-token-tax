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
  const name = `redesign-${s.w}-${s.theme}-${s.where}.png`;
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
  console.log("wrote", name);
  await page.close();
}
await browser.close();