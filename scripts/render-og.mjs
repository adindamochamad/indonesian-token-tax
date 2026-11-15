import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const results = JSON.parse(readFileSync(resolve(root, "results/results.json"), "utf8"));
const flores = results.rows.filter((r) => r.slice === "flores");
const ratios = flores.map((r) => r.ratio_id_en);
const min = Math.min(...ratios);
const max = Math.max(...ratios);
const minL = min.toFixed(2);
const maxL = max.toFixed(2);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f6f8"/>
  <text x="80" y="120" font-family="system-ui,sans-serif" font-size="42" fill="#4a5568">Indonesian Token Tax</text>
  <text x="80" y="280" font-family="system-ui,sans-serif" font-size="64" font-weight="700" fill="#1a1d21">
    ChatGPT (GPT-4o): ${minL}× tokens · up to ${maxL}× on Mistral
  </text>
  <text x="80" y="360" font-family="system-ui,sans-serif" font-size="36" fill="#4a5568">
    Same meaning in Indonesian — 25–84% more tokens than English.
  </text>
  <text x="80" y="520" font-family="system-ui,sans-serif" font-size="28" fill="#1d6b8a">Measured in your browser · 7 popular tools</text>
</svg>`;

const svgPath = resolve(root, "web/public/og.svg");
const pngPath = resolve(root, "web/public/og.png");
writeFileSync(svgPath, svg);

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  process.env.CHROME_PATH,
].filter(Boolean);

let ok = false;
for (const chrome of chromeCandidates) {
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1200,630",
      `--screenshot=${pngPath}`,
      `file://${svgPath}`,
    ],
    { stdio: "inherit" },
  );
  if (result.status === 0) {
    ok = true;
    break;
  }
}
if (!ok) {
  console.warn("Chrome screenshot failed; og.svg remains as fallback");
} else {
  console.log(`wrote ${pngPath}`);
}