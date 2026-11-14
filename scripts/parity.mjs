import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "../web");
const result = spawnSync(process.execPath, ["parity.mjs"], { cwd: web, stdio: "inherit" });
process.exit(result.status ?? 1);
