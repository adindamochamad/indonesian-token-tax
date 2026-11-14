import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontDir = resolve(root, "web/public/fonts");
mkdirSync(fontDir, { recursive: true });

const files = [
  {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter-tight@5.0.0/latin-400-normal.woff2",
    dest: "inter-tight-latin.woff2",
  },
  {
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter-tight@5.0.0/latin-600-normal.woff2",
    dest: "inter-tight-latin-600.woff2",
  },
  {
    url: "https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/GeistMono-Regular.woff2",
    dest: "geist-mono-latin.woff2",
  },
];

for (const { url, dest } of files) {
  const path = resolve(fontDir, dest);
  if (existsSync(path)) {
    console.log("skip", dest);
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", dest);
}