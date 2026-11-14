import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "web/public/favicon.ico");

/** Minimal 16×16 ICO with a single teal pixel block (uncompressed). */
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAH0lEQVQoz2NgGAWjYBSMglEwCjYwKMNgFIyCUTAKAPwAAX0AAV0lKp0HAAAAAElFTkSuQmCC";

function writeIco() {
  const png = Buffer.from(pngBase64, "base64");
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(16, 0);
  entry.writeUInt8(16, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  writeFileSync(out, Buffer.concat([header, entry, png]));
  console.log(`wrote ${out}`);
}

writeIco();