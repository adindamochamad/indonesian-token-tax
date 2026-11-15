import { fmtRatio, fmtInt, escapeHtml } from "./format.js";
import { shortNameFor } from "./specs.js";
import { sliceRows } from "./leaderboard.js";

export function floresRange(data) {
  const rows = sliceRows(data, "flores");
  const ratios = rows.map((r) => r.displayRatio);
  return {
    min: Math.min(...ratios),
    max: Math.max(...ratios),
    rows,
    wordRatio: rows[0]?.displayWord,
  };
}

function renderTokenBlocks(pieces, lang) {
  return pieces
    .map((piece) => {
      const visual = piece.startsWith(" ") ? `·${escapeHtml(piece.slice(1))}` : escapeHtml(piece);
      return `<span class="tok-block tok-${lang}" role="img" aria-hidden="true">${visual}</span>`;
    })
    .join("");
}

function renderStripFigure(strip, pairIndex, idText, enText) {
  const enBlocks = renderTokenBlocks(strip.en_pieces, "en");
  const idBlocks = renderTokenBlocks(strip.id_pieces, "id");
  return `<figure class="strip-unit" aria-labelledby="strip-${strip.short_name.replace(/\s+/g, "-")}">
    <figcaption id="strip-${strip.short_name.replace(/\s+/g, "-")}" class="strip-caption">
      <strong>${escapeHtml(strip.short_name)}</strong> · pair #${pairIndex} · <code>add_special_tokens=false</code>
    </figcaption>
    <div class="strip-row">
      <span class="strip-lang">EN</span>
      <span class="strip-text muted">${escapeHtml(enText)}</span>
      <span class="strip-count num mono">${strip.en_count}</span>
    </div>
    <div class="strip-blocks strip-blocks-en" aria-hidden="true">${enBlocks}</div>
    <div class="strip-row">
      <span class="strip-lang">ID</span>
      <span class="strip-text muted">${escapeHtml(idText)}</span>
      <span class="strip-count num mono">${strip.id_count}</span>
    </div>
    <div class="strip-blocks strip-blocks-id" aria-hidden="true">${idBlocks}</div>
  </figure>`;
}

export function renderHero(data) {
  const { min, max, rows, wordRatio } = floresRange(data);
  const nPairs = Number(data.meta?.slices?.flores?.n_pairs ?? 1012);
  const pairsLabel = nPairs.toLocaleString("en-US");
  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];
  const qwen = data.meta?.tokenizer_files?.find((f) => f.repo_id === "Qwen/Qwen2.5-7B-Instruct");
  const vocab = qwen?.vocab_file_sha256?.slice(0, 10) ?? "ca10d7e9fb";
  const worstTok = shortNameFor(priciest.tokenizer);
  const countStart = max.toFixed(2);

  return `
    <section class="sect sect-tax reveal" aria-labelledby="tax-label">
      <p class="sect-num" id="tax-label"><span class="sect-num-k">01</span> — The tax</p>
      <div class="hero-grid">
        <div class="hero-metric">
          <p class="hero-ratio" aria-label="Up to ${fmtRatio(max, 2)} times more tokens than English">
            <span class="hero-ratio-val" data-count-to="${max.toFixed(4)}" data-count-suffix="×">${countStart}×</span>
          </p>
          <p class="hero-range muted">Across seven tokenizers on FLORES-200: <strong class="num">${fmtRatio(min, 2)}–${fmtRatio(max, 2)}</strong></p>
        </div>
        <div class="hero-copy prose-narrow">
          <p class="hero-lede">
            Indonesian costs this many times the tokens of English on <strong>${escapeHtml(worstTok)}</strong>,
            even though it uses ~10% fewer words.
          </p>
          <ul class="hero-facts">
            <li><span class="num">${pairsLabel}</span> parallel FLORES pairs · <span class="num">7</span> tokenizers · word ratio ~<span class="num">${fmtRatio(wordRatio, 2)}</span> (fewer ID words)</li>
            <li>Cheapest: <strong>${escapeHtml(shortNameFor(cheapest.tokenizer))}</strong> <span class="num">${fmtRatio(cheapest.displayRatio, 2)}</span> · <span class="num mono">${fmtInt(cheapest.displayExtra)}</span> extra / 1M EN tokens</li>
            <li>Priciest: <strong>${escapeHtml(shortNameFor(priciest.tokenizer))}</strong> <span class="num">${fmtRatio(priciest.displayRatio, 2)}</span> · <span class="num mono">${fmtInt(priciest.displayExtra)}</span> extra / 1M EN tokens</li>
            <li>Qwen2.5 and Sailor2 share <code>vocab.json</code> (<code class="mono">${vocab}…</code>); identical token counts here</li>
          </ul>
        </div>
      </div>
      <div class="hero-strip" id="hero-strip" aria-live="polite">
        <p class="strip-loading muted" id="strip-status">Loading token strip…</p>
      </div>
    </section>`;
}

export async function mountHeroStrip() {
  const wrap = document.getElementById("hero-strip");
  const status = document.getElementById("strip-status");
  if (!wrap) return;
  try {
    const res = await fetch("hero-strip.json");
    const data = await res.json();
    const strips = data.strips ?? [
      {
        short_name: data.source?.tokenizer ?? "o200k_base",
        en_pieces: data.en_pieces,
        id_pieces: data.id_pieces,
        en_count: data.en_count,
        id_count: data.id_count,
      },
    ];
    const pairIndex = data.source?.pair_index ?? data.pair_index ?? 0;
    wrap.innerHTML = strips
      .map((s) => renderStripFigure(s, pairIndex, data.id_text, data.en_text))
      .join("");
  } catch {
    if (status) status.textContent = "Token strip unavailable (run prebuild).";
    else wrap.innerHTML = `<p class="muted">Token strip unavailable (run prebuild).</p>`;
  }
}