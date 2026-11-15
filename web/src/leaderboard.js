import { fmt, fmtRatio, fmtInt, escapeHtml } from "./format.js";
import { shortNameFor, revisionFor } from "./specs.js";
import { leaderboardAccentTokenizers, rowAccentClass, uniqueExtremeRatios } from "./accent.js";

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

function rowTip(row) {
  return [
    row.tokenizer,
    `revision ${row.revision}`,
    `ratio ${fmtRatio(row.displayRatio, 2)}`,
    `CI ${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`,
    `word ratio ${fmt(row.displayWord, 3)}`,
    `extra / 1M EN ${fmtInt(row.displayExtra)}`,
  ].join(" · ");
}

function renderChartDesktop(rows, { minTok, maxTok }) {
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
      const accent =
        row.tokenizer === minTok || row.tokenizer === maxTok;
      const rowClass = accent ? "chart-row chart-row-accent" : "chart-row";
      const tip = rowTip(row);
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

  return `<figure class="chart-wrap chart-desktop">
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc">
      <title id="chart-title">Indonesian over English token ratio by tokenizer</title>
      <desc id="chart-desc">Dot-and-whisker plot with 95% confidence intervals. Dashed line at 1.0 is same as English.</desc>
      ${grid}
      <line class="chart-parity" x1="${parityX}" x2="${parityX}" y1="${top - 4}" y2="${height - bottom}" stroke-dasharray="4 3"/>
      <text class="chart-parity-label" x="${parityX + 4}" y="${height - 10}">same as English</text>
      ${series}
    </svg>
  </figure>`;
}

function renderChartMobile(rows, uniqueMin, uniqueMax) {
  const width = 360;
  const pad = 8;
  const top = 52;
  const rowH = 56;
  const whiskerY = 38;
  const labelY = 16;
  const height = top + rows.length * rowH + 16;
  const plotW = width - pad * 2;
  const maxX = 2.0;
  const x = (v) => pad + (Math.min(maxX, Math.max(0, v)) / maxX) * plotW;

  const ticks = TICKS.map((t) => {
    const px = x(t);
    return `<text class="chart-tick chart-tick-mobile" x="${px}" y="22" text-anchor="middle">${t.toFixed(2)}</text>
      <line class="chart-grid" x1="${px}" x2="${px}" y1="28" y2="${height - 8}"/>`;
  }).join("");

  const parityX = x(1);
  const parity = `<line class="chart-parity" x1="${parityX}" x2="${parityX}" y1="28" y2="${height - 8}" stroke-dasharray="4 3"/>
    <text class="chart-parity-label chart-parity-mobile" x="${parityX + 4}" y="40">same as English</text>`;

  const series = rows
    .map((row, i) => {
      const rowTop = top + i * rowH;
      const cy = rowTop + whiskerY;
      const lo = x(row.displayLo);
      const hi = x(row.displayHi);
      const dot = x(row.displayRatio);
      const accentClass = rowAccentClass(row.displayRatio, uniqueMin, uniqueMax);
      const rowClass = accentClass ? `chart-mobile-row ${accentClass}` : "chart-mobile-row";
      const tip = rowTip(row);
      return `<g class="${rowClass}" tabindex="0" role="graphics-symbol" aria-label="${escapeHtml(tip)}">
        <title>${escapeHtml(tip)}</title>
        <text class="chart-mobile-name" x="${pad}" y="${rowTop + labelY}">${escapeHtml(row.shortName)}</text>
        <text class="chart-mobile-value num" x="${width - pad}" y="${rowTop + labelY}" text-anchor="end">${fmtRatio(row.displayRatio, 2)}</text>
        <line x1="${lo}" x2="${hi}" y1="${cy}" y2="${cy}" class="chart-whisker"/>
        <line x1="${lo}" x2="${lo}" y1="${cy - 5}" y2="${cy + 5}" class="chart-cap"/>
        <line x1="${hi}" x2="${hi}" y1="${cy - 5}" y2="${cy + 5}" class="chart-cap"/>
        <circle class="chart-dot" cx="${dot}" cy="${cy}" r="4.5"/>
      </g>`;
    })
    .join("");

  return `<figure class="chart-wrap chart-mobile">
    <svg class="chart chart-mobile-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-mobile chart-desc-mobile">
      <title id="chart-title-mobile">Indonesian over English token ratio by tokenizer</title>
      <desc id="chart-desc-mobile">Mobile dot-and-whisker plot, 1.0 to 2.0.</desc>
      ${ticks}
      ${parity}
      ${series}
    </svg>
  </figure>`;
}

export function renderChart(rows) {
  const accents = leaderboardAccentTokenizers(rows);
  const { uniqueMin, uniqueMax } = uniqueExtremeRatios(rows, (r) => r.displayRatio);
  return `${renderChartDesktop(rows, accents)}${renderChartMobile(rows, uniqueMin, uniqueMax)}
    <p class="sr-only">See the sortable table below for the same numbers.</p>`;
}

const COLS = [
  { key: "shortName", label: "Tokenizer", num: false },
  { key: "displayRatio", label: "ID/EN tokens", num: true },
  { key: "ci", label: "95% CI", num: true, sortKey: "displayLo", hideSm: true },
  { key: "displayWord", label: "ID/EN words", num: true, hideSm: true },
  { key: "displayExtra", label: "Extra per 1M EN tokens", num: true },
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
  const { minTok, maxTok } = leaderboardAccentTokenizers(rows);
  const head = COLS.map((c) => {
    const sm = c.hideSm ? " col-hide-sm" : "";
    return `<th scope="col" class="${c.num ? "num" : ""}${sm}" data-sort="${c.sortKey ?? c.key}">${c.label}<span class="sort" aria-hidden="true"></span></th>`;
  }).join("");
  const body = sorted
    .map((row) => {
      const tier =
        row.tokenizer === minTok ? "best" : row.tokenizer === maxTok ? "worst" : "";
      const ci = `${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`;
      const title = `${row.tokenizer} @ ${row.revision}`;
      return `<tr class="${tier}" data-tok="${escapeHtml(row.tokenizer)}">
      <td title="${escapeHtml(title)}"><strong>${escapeHtml(row.shortName)}</strong></td>
      <td class="num" data-label="ID/EN tokens">${fmtRatio(row.displayRatio, 2)}</td>
      <td class="num ci-cell col-hide-sm" data-label="95% CI">${ci}</td>
      <td class="num col-hide-sm" data-label="ID/EN words">${fmt(row.displayWord, 3)}</td>
      <td class="num" data-label="Extra / 1M EN">${fmtInt(row.displayExtra)}</td>
    </tr>`;
    })
    .join("");
  return `<div class="table-scroll" role="region" aria-label="Tokenizer leaderboard table" tabindex="0">
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
        <thead><tr><th scope="col">Tokenizer</th><th scope="col" class="num">Indonesian tokens</th></tr></thead>
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