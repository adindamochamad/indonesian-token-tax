import { Tiktoken } from "js-tiktoken/lite";
import cl100kRanks from "js-tiktoken/ranks/cl100k_base";
import o200kRanks from "js-tiktoken/ranks/o200k_base";

export const TOKENIZER_SPECS = [
  { name: "cl100k_base", kind: "tiktoken", encoding: "cl100k_base" },
  { name: "o200k_base", kind: "tiktoken", encoding: "o200k_base" },
  {
    name: "Qwen/Qwen2.5-7B-Instruct",
    kind: "hf",
    repoId: "Qwen/Qwen2.5-7B-Instruct",
    revision: "a09a35458c702b33eeacc393d103063234e8bc28",
  },
  {
    name: "mistralai/Mistral-7B-Instruct-v0.3",
    kind: "hf",
    repoId: "mistralai/Mistral-7B-Instruct-v0.3",
    revision: "c170c708c41dac9275d15a8fff4eca08d52bab71",
  },
  {
    name: "sail/Sailor2-8B",
    kind: "hf",
    repoId: "sail/Sailor2-8B",
    revision: "fb9e3b997bd6d39172e247f85eacbf77e5919bd3",
  },
  {
    name: "deepseek-ai/DeepSeek-V3",
    kind: "hf",
    repoId: "deepseek-ai/DeepSeek-V3",
    revision: "e815299b0bcbac849fa540c768ef21845365c9eb",
  },
  {
    name: "aisingapore/Llama-SEA-LION-v3-8B-IT",
    kind: "hf",
    repoId: "aisingapore/Llama-SEA-LION-v3-8B-IT",
    revision: "8c47429ff91723eb72dc2845e6d6f47ef6d49e18",
  },
];

const cache = new Map();

function tiktokenFromName(encoding) {
  const ranks = encoding === "o200k_base" ? o200kRanks : cl100kRanks;
  return new Tiktoken(ranks);
}

export function nTokensTiktoken(enc, text) {
  if (text === "") return 0;
  return enc.encode(text).length;
}

export function piecesTiktoken(enc, text) {
  if (text === "") return [];
  const ids = enc.encode(text);
  return piecesFromIds(text, ids, (buf) => enc.decode(buf));
}

function normalizeDecoded(decoded, pos) {
  let piece = decoded.replaceAll("\uFFFD", "").replaceAll("\u2581", " ");
  if (pos === 0 && piece.startsWith(" ")) piece = piece.slice(1);
  return piece;
}

function consumePiece(text, pos, piece) {
  if (!piece) return null;
  if (text.startsWith(piece, pos)) {
    return { next: pos + piece.length, span: text.slice(pos, pos + piece.length) };
  }
  if (text[pos] === " " && text.startsWith(piece, pos + 1)) {
    const next = pos + 1 + piece.length;
    return { next, span: text.slice(pos, next) };
  }
  return null;
}

function piecesFromIds(text, ids, decodeBuf) {
  if (text === "") return [];
  const pieces = [];
  let pos = 0;
  let buf = [];
  for (const id of ids) {
    buf.push(id);
    let decoded = "";
    try {
      decoded = decodeBuf(buf.length === 1 ? buf : [id]);
    } catch {
      decoded = "";
    }
    let hit = consumePiece(text, pos, normalizeDecoded(decoded, pos));
    if (hit) {
      pieces.push(hit.span);
      pos = hit.next;
      buf = [];
      continue;
    }
    try {
      decoded = decodeBuf(buf);
    } catch {
      continue;
    }
    if (decoded.includes("\uFFFD") && pos + decoded.length < text.length) {
      continue;
    }
    hit = consumePiece(text, pos, normalizeDecoded(decoded, pos));
    if (hit) {
      pieces.push(hit.span);
      pos = hit.next;
      buf = [];
    }
  }
  if (pos < text.length) {
    pieces.push(text.slice(pos));
  }
  return pieces;
}

async function loadHfTokenizer(spec) {
  const { AutoTokenizer, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = typeof caches !== "undefined";
  return AutoTokenizer.from_pretrained(spec.repoId, {
    revision: spec.revision,
  });
}

export function nTokensHf(tokenizer, text) {
  if (text === "") return 0;
  const ids = tokenizer.encode(text, { add_special_tokens: false });
  return ids.length;
}

export function piecesHf(tokenizer, text) {
  if (text === "") return [];
  const ids = tokenizer.encode(text, { add_special_tokens: false });
  return piecesFromIds(text, ids, (buf) => tokenizer.decode(buf, { skip_special_tokens: false }));
}

export async function loadTokenizer(spec, onStatus) {
  if (cache.has(spec.name)) return cache.get(spec.name);
  if (onStatus) onStatus(spec.name, "loading");
  let loaded;
  if (spec.kind === "tiktoken") {
    loaded = { spec, kind: "tiktoken", enc: tiktokenFromName(spec.encoding) };
  } else {
    const tokenizer = await loadHfTokenizer(spec);
    loaded = { spec, kind: "hf", tokenizer };
  }
  cache.set(spec.name, loaded);
  if (onStatus) onStatus(spec.name, "ready");
  return loaded;
}

export function countAndPieces(loaded, text) {
  if (loaded.kind === "tiktoken") {
    const n = nTokensTiktoken(loaded.enc, text);
    const pieces = piecesTiktoken(loaded.enc, text);
    return { n, pieces };
  }
  const n = nTokensHf(loaded.tokenizer, text);
  const pieces = piecesHf(loaded.tokenizer, text);
  return { n, pieces };
}

export function charsPerToken(text, n) {
  if (!n) return null;
  return text.length / n;
}
