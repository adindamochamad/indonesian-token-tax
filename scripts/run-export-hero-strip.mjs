import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const venvPy = resolve(root, ".venv/bin/python");
const py = existsSync(venvPy) ? venvPy : "python3";
const script = resolve(root, "scripts/export_hero_strip.py");
const res = spawnSync(py, [script], { stdio: "inherit", cwd: root });
if (res.status !== 0) {
  process.exit(res.status ?? 1);
}