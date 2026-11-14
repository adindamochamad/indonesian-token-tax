import { fmt, fmtRatio, fmtInt, escapeHtml } from "./format.js";
import { shortNameFor, revisionFor } from "./specs.js";

const SLICE_CAVEATS = {
  flores: "Formal, professionally translated news-like text (FLORES-200 devtest).",
  domain:
    "Synthetic slice (n≈30): chat, support, code comments, formal letters. Small sample — illustration only.",
  informal:
    "Synthetic slang (n≈40): fuller English gloss is often longer than Indonesian, so token ratios can sit near parity.",
  informal_matched:
    "Same informal pairs with length-matched English (word count within 1). Still only 40 pairs — wide CIs.",
};

const TICKS = [1.0, 1.25, 1.5, 1.75, 2.0];

export function sliceRows(data, sliceKey) {
  const matched = sliceKey === "informal_matched";
  const slice = matched ? "informal" : sliceKey;
  return data.rows
    .filter((row) => row.slice === slice)
    .map((row) => {
      const ratio = matched ? row.ratio_id_en_matched : row.ratio_id_en;
      const lo = matched ? row.ratio_matched_ci_low : row.ratio_ci_low;
      const hi = matched ? row.ratio_matched_ci_high : row.ratio_ci_high;
      const word = matched ? row.word_ratio_id_en_matched : row.word_ratio_id_en;
      const extra = matched ? row.extra_tokens_per_1m_en_matched : row.extra_tokens_per_1m_en;
      return {
        ...row,
        displayRatio: ratio,
        displayLo: lo,
        displayHi: hi,
        displayWord: word,
        displayExtra: extra,
        shortName: shortNameFor(row.tokenizer),
        revision: revisionFor(data, row.tokenizer),
      };
    })
    .sort((a, b) => a.displayRatio - b.displayRatio);
}

export function sliceCaveat(sliceKey) {
  return SLICE_CAVEATS[sliceKey] ?? "";
}

export function renderChart(rows) {
  const width = 920;
  const rowH = 44;
  const left = 8;
  const labelW = 152;
  const right = 72;
  const top = 40;
  const bottom = 32;
  const height = top + rows.length * rowH + bottom;
  const plotLeft = left + labelW;
  const plotW = width - plotLeft - right;
  const maxX = 2.0;
  const x = (v) => plotLeft + (Math.min(maxX, Math.max(0, v)) / maxX) * plotW;
  const bestTok = rows[0]?.tokenizer;
  const worstTok = rows[rows.length - 1]?.tokenizer;

  const grid = TICKS.map((t) => {
    const px = x(t);
    return `<line class="chart-grid" x1="${px}" x2="${px}" y1="${top - 4}" y2="${height - bottom}" />
      <text class="chart-tick" x="${px}" y="${top - 14}" text-anchor="middle">${t.toFixed(2)}</text>`;
  }).join("");

  const parityX = x(1);
  const series = rows
    .map((row, i) => {
      const cy = top + i * rowH + rowH / 2;
      const lo = x(row.displayLo);
      const hi = x(row.displayHi);
      const dot = x(row.displayRatio);
      const accent = row.tokenizer === bestTok || row.tokenizer === worstTok;
      const rowClass = accent ? "chart-row chart-row-accent" : "chart-row";
      const tip = [
        row.tokenizer,
        `revision ${row.revision}`,
        `ratio ${fmtRatio(row.displayRatio, 2)}`,
        `CI ${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`,
        `word ratio ${fmt(row.displayWord, 3)}`,
        `extra / 1M EN ${fmtInt(row.displayExtra)}`,
      ].join(" · ");
      return `<g class="${rowClass}" tabindex="0" role="graphics-symbol" aria-label="${escapeHtml(tip)}">
        <title>${escapeHtml(tip)}</title>
        <text class="chart-label" x="${plotLeft - 10}" y="${cy + 4}" text-anchor="end">${escapeHtml(row.shortName)}</text>
        <line x1="${lo}" x2="${hi}" y1="${cy}" y2="${cy}" class="chart-whisker"/>
        <line x1="${lo}" x2="${lo}" y1="${cy - 6}" y2="${cy + 6}" class="chart-cap"/>
        <line x1="${hi}" x2="${hi}" y1="${cy - 6}" y2="${cy + 6}" class="chart-cap"/>
        <circle class="chart-dot" cx="${dot}" cy="${cy}" r="5"/>
        <text class="chart-value num" x="${width - right + 6}" y="${cy + 4}">${fmtRatio(row.displayRatio, 2)}</text>
      </g>`;
    })
    .join("");

  return `<figure class="chart-wrap">
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc">
      <title id="chart-title">Indonesian over English token ratio by tokenizer</title>
      <desc id="chart-desc">Dot-and-whisker plot with 95% confidence intervals. Dashed line at 1.0 is same as English.</desc>
      ${grid}
      <line class="chart-parity" x1="${parityX}" x2="${parityX}" y1="${top - 4}" y2="${height - bottom}" stroke-dasharray="4 3"/>
      <text class="chart-parity-label" x="${parityX + 4}" y="${height - 10}">same as English</text>
      ${series}
    </svg>
    <p class="sr-only">See the sortable table below for the same numbers.</p>
  </figure>`;
}

const COLS = [
  { key: "shortName", label: "Tokenizer", num: false },
  { key: "displayRatio", label: "ID/EN tokens", num: true, ratio: true },
  { key: "displayLo", label: "95% CI low", num: true, hidden: "compact" },
  { key: "displayHi", label: "95% CI high", num: true, hidden: "compact" },
  { key: "displayWord", label: "ID/EN words", num: true },
  { key: "displayExtra", label: "Extra / 1M EN", num: true, int: true },
];

export function renderTable(rows, sort) {
  const sorted = [...rows];
  if (sort?.key) {
    const dir = sort.dir === "desc" ? -1 : 1;
    sorted.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  const bestTok = rows[0]?.tokenizer;
  const worstTok = rows[rows.length - 1]?.tokenizer;
  const head = COLS.filter((c) => c.hidden !== "compact")
    .map(
      (c) =>
        `<th scope="col" class="${c.num ? "num" : ""}" data-sort="${c.key}">${c.label}<span class="sort" aria-hidden="true"></span></th>`,
    )
    .join("");
  const body = sorted
    .map((row) => {
      const tier =
        row.tokenizer === bestTok ? "best" : row.tokenizer === worstTok ? "worst" : "";
      const ci = `${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`;
      const title = `${row.tokenizer} @ ${row.revision}`;
      return `<tr class="${tier}" data-tok="${escapeHtml(row.tokenizer)}">
      <td title="${escapeHtml(title)}"><strong>${escapeHtml(row.shortName)}</strong></td>
      <td class="num" data-label="ID/EN tokens">${fmtRatio(row.displayRatio, 2)}</td>
      <td class="num" data-label="95% CI">${ci}</td>
      <td class="num" data-label="ID/EN words">${fmt(row.displayWord, 3)}</td>
      <td class="num" data-label="Extra / 1M EN">${fmtInt(row.displayExtra)}</td>
    </tr>`;
    })
    .join("");
  return `<div class="table-scroll" role="region" aria-label="Tokenizer leaderboard table">
    <table class="board-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

export function renderCalculator(rows) {
  const body = rows
    .map(
      (row) => `<tr data-ratio="${row.displayRatio}">
        <td>${escapeHtml(row.shortName)}</td>
        <td class="num calc-out">—</td>
      </tr>`,
    )
    .join("");
  return `<section class="calculator block-quiet" aria-labelledby="calc-title">
    <h2 id="calc-title" class="h3">What does this mean?</h2>
    <p class="muted">Token multipliers only — not dollar prices.</p>
    <label for="en-tokens">If English uses this many tokens…</label>
    <input type="number" id="en-tokens" min="0" step="1000" value="1000000" inputmode="numeric" />
    <div class="table-scroll">
      <table class="calc-table">
        <thead><tr><th>Tokenizer</th><th class="num">Indonesian tokens</th></tr></thead>
        <tbody id="calc-body">${body}</tbody>
      </table>
    </div>
  </section>`;
}

export function updateCalculator() {
  const input = document.getElementById("en-tokens");
  if (!input) return;
  const en = Number(input.value);
  const tbody = document.getElementById("calc-body");
  if (!tbody || !Number.isFinite(en)) return;
  tbody.querySelectorAll("tr").forEach((tr) => {
    const ratio = Number(tr.dataset.ratio);
    const out = tr.querySelector(".calc-out");
    if (out && Number.isFinite(ratio)) {
      out.textContent = Math.round(en * ratio).toLocaleString("en-US");
    }
  });
}