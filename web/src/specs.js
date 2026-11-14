/** Lightweight tokenizer metadata (no js-tiktoken / transformers imports). */

export const TOKENIZER_SPECS = [
  {
    name: "cl100k_base",
    shortName: "cl100k_base",
    kind: "tiktoken",
    encoding: "cl100k_base",
  },
  {
    name: "o200k_base",
    shortName: "o200k_base",
    kind: "tiktoken",
    encoding: "o200k_base",
  },
  {
    name: "Qwen/Qwen2.5-7B-Instruct",
    shortName: "Qwen2.5",
    kind: "hf",
    repoId: "Qwen/Qwen2.5-7B-Instruct",
    revision: "a09a35458c702b33eeacc393d103063234e8bc28",
  },
  {
    name: "mistralai/Mistral-7B-Instruct-v0.3",
    shortName: "Mistral v0.3",
    kind: "hf",
    repoId: "mistralai/Mistral-7B-Instruct-v0.3",
    revision: "c170c708c41dac9275d15a8fff4eca08d52bab71",
  },
  {
    name: "sail/Sailor2-8B",
    shortName: "Sailor2",
    kind: "hf",
    repoId: "sail/Sailor2-8B",
    revision: "fb9e3b997bd6d39172e247f85eacbf77e5919bd3",
  },
  {
    name: "deepseek-ai/DeepSeek-V3",
    shortName: "DeepSeek-V3",
    kind: "hf",
    repoId: "deepseek-ai/DeepSeek-V3",
    revision: "e815299b0bcbac849fa540c768ef21845365c9eb",
  },
  {
    name: "aisingapore/Llama-SEA-LION-v3-8B-IT",
    shortName: "SEA-LION v3",
    kind: "hf",
    repoId: "aisingapore/Llama-SEA-LION-v3-8B-IT",
    revision: "8c47429ff91723eb72dc2845e6d6f47ef6d49e18",
  },
];

export function shortNameFor(tokenizer) {
  const spec = TOKENIZER_SPECS.find((s) => s.name === tokenizer);
  return spec?.shortName ?? tokenizer;
}

export function revisionFor(data, tokenizer) {
  const file = data?.meta?.tokenizer_files?.find((f) => f.repo_id === tokenizer);
  if (file) return file.revision;
  const spec = TOKENIZER_SPECS.find((s) => s.name === tokenizer);
  return spec?.revision ?? "—";
}