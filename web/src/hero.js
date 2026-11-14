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

export function renderHero(data) {
  const { min, max, rows, wordRatio } = floresRange(data);
  const nPairs = Number(data.meta?.slices?.flores?.n_pairs ?? 1012);
  const pairsLabel = nPairs.toLocaleString("en-US");
  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];
  const qwen = data.meta?.tokenizer_files?.find((f) => f.repo_id === "Qwen/Qwen2.5-7B-Instruct");
  const vocab = qwen?.vocab_file_sha256?.slice(0, 10) ?? "ca10d7e9fb";
  const worstTok = shortNameFor(priciest.tokenizer);

  return `
    <section class="sect sect-tax reveal" aria-labelledby="tax-label">
      <p class="sect-num" id="tax-label"><span class="sect-num-k">01</span> — The tax</p>
      <div class="hero-grid">
        <div class="hero-metric">
          <p class="hero-ratio" aria-label="Up to ${fmtRatio(max, 2)} times more tokens than English">
            <span class="hero-ratio-val" data-count-to="${max.toFixed(4)}" data-count-suffix="×">${fmtRatio(max, 2)}</span>
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
      <figure class="hero-strip" id="hero-strip" aria-labelledby="strip-caption">
        <figcaption id="strip-caption" class="visually-hidden">One FLORES sentence pair tokenized with o200k_base: Indonesian uses more tokens than English.</figcaption>
        <p class="strip-loading muted" id="strip-status">Loading token strip…</p>
      </figure>
    </section>`;
}

export async function mountHeroStrip() {
  const wrap = document.getElementById("hero-strip");
  const status = document.getElementById("strip-status");
  if (!wrap) return;
  try {
    const res = await fetch("hero-strip.json");
    const data = await res.json();
    const enBlocks = renderTokenBlocks(data.en_pieces, "en");
    const idBlocks = renderTokenBlocks(data.id_pieces, "id");
    wrap.innerHTML = `
      <div class="strip-row">
        <span class="strip-lang">EN</span>
        <span class="strip-text muted">${escapeHtml(data.en_text)}</span>
        <span class="strip-count num mono">${data.en_count}</span>
      </div>
      <div class="strip-blocks strip-blocks-en" aria-hidden="true">${enBlocks}</div>
      <div class="strip-row">
        <span class="strip-lang">ID</span>
        <span class="strip-text muted">${escapeHtml(data.id_text)}</span>
        <span class="strip-count num mono">${data.id_count}</span>
      </div>
      <div class="strip-blocks strip-blocks-id" aria-hidden="true">${idBlocks}</div>
      <p class="strip-note muted small">o200k_base · <code>add_special_tokens=false</code> · first FLORES devtest pair</p>`;
  } catch {
    if (status) status.textContent = "Token strip unavailable (run prebuild).";
  }
}