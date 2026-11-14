import { TOKENIZER_SPECS } from "./specs.js";

const cache = new Map();

async function tiktokenFromName(encoding) {
  const { Tiktoken } = await import("js-tiktoken/lite");
  const ranksMod =
    encoding === "o200k_base"
      ? await import("js-tiktoken/ranks/o200k_base")
      : await import("js-tiktoken/ranks/cl100k_base");
  return new Tiktoken(ranksMod.default);
}

export function nTokensTiktoken(enc, text) {
  if (text === "") return 0;
  return enc.encode(text).length;
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
      pieces.push({ id, text: hit.span });
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
      const pieceId = buf.length === 1 ? buf[0] : id;
      pieces.push({ id: pieceId, text: hit.span });
      pos = hit.next;
      buf = [];
    }
  }
  if (pos < text.length) {
    pieces.push({ id: null, text: text.slice(pos) });
  }
  return pieces;
}

export function piecesTiktoken(enc, text) {
  if (text === "") return [];
  const ids = enc.encode(text);
  return piecesFromIds(text, ids, (buf) => enc.decode(buf));
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
    const enc = await tiktokenFromName(spec.encoding);
    loaded = { spec, kind: "tiktoken", enc };
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
    return { n, pieces, ids: pieces.map((p) => p.id) };
  }
  const ids = loaded.tokenizer.encode(text, { add_special_tokens: false });
  const n = ids.length;
  const pieces = piecesHf(loaded.tokenizer, text);
  return { n, pieces, ids };
}

export function charsPerToken(text, n) {
  if (!n) return null;
  return text.length / n;
}

const PALETTE = [
  "var(--token-0)",
  "var(--token-1)",
  "var(--token-2)",
  "var(--token-3)",
  "var(--token-4)",
  "var(--token-5)",
];

function displayPieceText(text) {
  if (text.startsWith(" ")) return `·${text.slice(1)}`;
  return text;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function colorizePieces(pieces) {
  if (!pieces.length) return '<em class="muted">empty → 0 tokens</em>';
  return pieces
    .map((piece, i) => {
      const color = PALETTE[i % PALETTE.length];
      const label = escapeHtml(displayPieceText(piece.text));
      const title = piece.id == null ? "remainder" : `token id ${piece.id}`;
      return `<span class="token-piece" style="background:${color}" title="${escapeHtml(title)}">${label}</span>`;
    })
    .join("");
}

export { TOKENIZER_SPECS };