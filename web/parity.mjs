/** Run from web/: `node parity.mjs`. Wrapper at ../scripts/parity.mjs. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Tiktoken } from "js-tiktoken/lite";
import cl100kRanks from "js-tiktoken/ranks/cl100k_base";
import o200kRanks from "js-tiktoken/ranks/o200k_base";
import { AutoTokenizer, env } from "@huggingface/transformers";

const webRoot = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(webRoot, "fixtures/parity.json"), "utf8"));

const HF = [
  ["Qwen/Qwen2.5-7B-Instruct", "a09a35458c702b33eeacc393d103063234e8bc28"],
  ["mistralai/Mistral-7B-Instruct-v0.3", "c170c708c41dac9275d15a8fff4eca08d52bab71"],
  ["sail/Sailor2-8B", "fb9e3b997bd6d39172e247f85eacbf77e5919bd3"],
  ["deepseek-ai/DeepSeek-V3", "e815299b0bcbac849fa540c768ef21845365c9eb"],
  ["aisingapore/Llama-SEA-LION-v3-8B-IT", "8c47429ff91723eb72dc2845e6d6f47ef6d49e18"],
];

function countTiktoken(enc, texts) {
  return texts.map((t) => (t === "" ? 0 : enc.encode(t).length));
}

function countHf(tokenizer, texts, addSpecial) {
  return texts.map((t) =>
    t === "" ? 0 : tokenizer.encode(t, { add_special_tokens: addSpecial }).length,
  );
}

function compare(name, side, jsCounts, pyCounts, texts) {
  const mismatches = [];
  for (let i = 0; i < pyCounts.length; i += 1) {
    if (jsCounts[i] !== pyCounts[i]) {
      mismatches.push({ i, js: jsCounts[i], py: pyCounts[i], text: texts[i].slice(0, 80) });
    }
  }
  return { name, side, match: mismatches.length === 0, mismatches };
}

async function main() {
  env.allowLocalModels = false;
  const reports = [];

  const cl100k = new Tiktoken(cl100kRanks);
  const o200k = new Tiktoken(o200kRanks);
  reports.push(compare("cl100k_base", "id", countTiktoken(cl100k, fixture.id_texts), fixture.python_counts.cl100k_base.id, fixture.id_texts));
  reports.push(compare("cl100k_base", "en", countTiktoken(cl100k, fixture.en_texts), fixture.python_counts.cl100k_base.en, fixture.en_texts));
  reports.push(compare("o200k_base", "id", countTiktoken(o200k, fixture.id_texts), fixture.python_counts.o200k_base.id, fixture.id_texts));
  reports.push(compare("o200k_base", "en", countTiktoken(o200k, fixture.en_texts), fixture.python_counts.o200k_base.en, fixture.en_texts));

  for (const [repo, revision] of HF) {
    process.stderr.write(`loading ${repo}@${revision.slice(0, 12)}…\n`);
    const tokenizer = await AutoTokenizer.from_pretrained(repo, { revision });
    reports.push(
      compare(repo, "id", countHf(tokenizer, fixture.id_texts, false), fixture.python_counts[repo].id, fixture.id_texts),
    );
    reports.push(
      compare(repo, "en", countHf(tokenizer, fixture.en_texts, false), fixture.python_counts[repo].en, fixture.en_texts),
    );
  }

  const byTok = new Map();
  for (const r of reports) {
    const prev = byTok.get(r.name) || { name: r.name, match: true, mismatches: [] };
    prev.match = prev.match && r.match;
    prev.mismatches.push(...r.mismatches.map((m) => ({ ...m, side: r.side })));
    byTok.set(r.name, prev);
  }

  console.log("tokenizer\tmatch");
  let failed = false;
  for (const row of byTok.values()) {
    console.log(`${row.name}\t${row.match ? "yes" : "no"}`);
    if (!row.match) {
      failed = true;
      for (const m of row.mismatches.slice(0, 8)) {
        console.error(`  ${m.side}[${m.i}] js=${m.js} py=${m.py} ${JSON.stringify(m.text)}`);
      }
      const delta = row.mismatches[0] ? row.mismatches[0].js - row.mismatches[0].py : 0;
      console.error(
        `  first delta=${delta}; a constant +1/+2 often means special tokens (BOS/EOS) were counted on one side`,
      );
    }
  }
  if (failed) process.exitCode = 1;
}

await main();
