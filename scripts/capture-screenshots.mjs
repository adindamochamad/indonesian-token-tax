import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultOut = "/Users/mac/Development/indonesian-token-tax/web/screenshots";
const outDir = process.argv[2] ? resolve(process.argv[2]) : defaultOut;
mkdirSync(outDir, { recursive: true });

const chrome =
  "/Users/mac/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const shots = [
  { w: 375, tab: "leaderboard", theme: "light", run: false },
  { w: 1280, tab: "leaderboard", theme: "light", run: false },
  { w: 375, tab: "leaderboard", theme: "dark", run: false },
  { w: 1280, tab: "leaderboard", theme: "dark", run: false },
  { w: 375, tab: "try", theme: "light", run: true },
  { w: 1280, tab: "try", theme: "light", run: true },
  { w: 375, tab: "try", theme: "dark", run: true },
  { w: 1280, tab: "try", theme: "dark", run: true },
];

const browser = await chromium.launch({ executablePath: chrome, headless: true });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: 900 } });
  const q = new URLSearchParams();
  if (s.tab === "try") q.set("tab", "try");
  if (s.run) q.set("run", "1");
  q.set("theme", s.theme);
  await page.goto(`http://127.0.0.1:4173/?${q}`, { waitUntil: "networkidle", timeout: 60000 });
  if (s.run) {
    await page.waitForFunction(
      () => document.querySelectorAll("#try-details .status.ok").length === 7,
      { timeout: 120000 },
    );
  }
  const name = `${s.tab}-${s.w}-${s.theme}.png`;
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
  console.log("wrote", name);
  await page.close();
}
await browser.close();