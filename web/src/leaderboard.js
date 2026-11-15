import { fmt, fmtRatio, fmtCount, fmtAxisTick, escapeHtml } from "./format.js";
import { productNameFor, technicalIdFor, revisionFor } from "./specs.js";
import { leaderboardAccentTokenizers, rowAccentClass, uniqueExtremeRatios } from "./accent.js";
import { getLang, t } from "./i18n.js";

const SLICE_CAVEATS = {
  flores: {
    id: "Teks formal, terjemahan profesional (FLORES-200 devtest).",
    en: "Formal, professionally translated text (FLORES-200 devtest).",
  },
  domain: {
    id: "Irisan sintetis (n≈30): obrolan, dukungan, komentar kode, surat formal. Contoh kecil — hanya ilustrasi.",
    en: "Synthetic slice (n≈30): chat, support, code comments, formal letters. Small sample — illustration only.",
  },
  informal: {
    id: "Gaul sintetis (n≈40): glossa Inggris lengkap sering lebih panjang daripada Indonesia, rasio token bisa mendekati 1.",
    en: "Synthetic slang (n≈40): fuller English gloss is often longer than Indonesian, so token ratios can sit near parity.",
  },
  informal_matched: {
    id: "Pasangan gaul yang sama dengan Inggris panjang disamakan (±1 kata). Masih 40 pasang — selang lebar.",
    en: "Same informal pairs with length-matched English (word count within 1). Still only 40 pairs — wide CIs.",
  },
};

const TICKS = [1.0, 1.25, 1.5, 1.75, 2.0];
const AXIS_MIN = 1.0;
const AXIS_MAX = 2.0;

function scaleX(v, plotLeft, plotW) {
  const clamped = Math.min(AXIS_MAX, Math.max(AXIS_MIN, v));
  return plotLeft + ((clamped - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
}

export function sliceRows(data, sliceKey) {
  const matched = sliceKey === "informal_matched";
  const slice = matched ? "informal" : sliceKey;
  const lang = getLang();
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
        productName: productNameFor(row.tokenizer, lang),
        technicalId: technicalIdFor(row.tokenizer),
        shortName: productNameFor(row.tokenizer, lang),
        revision: revisionFor(data, row.tokenizer),
      };
    })
    .sort((a, b) => a.displayRatio - b.displayRatio);
}

export function sliceCaveat(sliceKey) {
  const entry = SLICE_CAVEATS[sliceKey];
  if (!entry) return "";
  const lang = getLang();
  return entry[lang] ?? entry.id;
}

function rowTip(row) {
  const lang = getLang();
  const product = productNameFor(row.tokenizer, lang);
  return [
    product,
    row.technicalId,
    `${t("colRatio")} ${fmtRatio(row.displayRatio, 2)}`,
    `${t("colCi")} ${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`,
    `${t("colWords")} ${fmt(row.displayWord, 3)}`,
    `${fmtCount(Math.round(1000 * row.displayRatio))} / 1k EN`,
  ].join(" · ");
}

function renderChartDesktop(rows, { minTok, maxTok }) {
  const width = 920;
  const rowH = 48;
  const left = 8;
  const labelW = 168;
  const right = 72;
  const top = 44;
  const bottom = 36;
  const height = top + rows.length * rowH + bottom;
  const plotLeft = left + labelW;
  const plotW = width - plotLeft - right;
  const x = (v) => scaleX(v, plotLeft, plotW);

  const grid = TICKS.map((tick) => {
    const px = x(tick);
    return `<line class="chart-grid" x1="${px}" x2="${px}" y1="${top - 4}" y2="${height - bottom}" />
      <text class="chart-tick" x="${px}" y="${top - 14}" text-anchor="middle">${fmtAxisTick(tick)}</text>`;
  }).join("");

  const parityX = x(1);
  const series = rows
    .map((row) => {
      const i = rows.indexOf(row);
      const cy = top + i * rowH + rowH / 2;
      const lo = x(row.displayLo);
      const hi = x(row.displayHi);
      const dot = x(row.displayRatio);
      const accent =
        (minTok && row.tokenizer === minTok) || (maxTok && row.tokenizer === maxTok);
      const rowClass = accent ? "chart-row chart-row-accent" : "chart-row";
      const tip = rowTip(row);
      const label = `${row.productName}`;
      const sub = row.technicalId;
      return `<g class="${rowClass}" tabindex="0" role="graphics-symbol" aria-label="${escapeHtml(tip)}">
        <title>${escapeHtml(tip)}</title>
        <text class="chart-label" x="${plotLeft - 10}" y="${cy - 2}" text-anchor="end">${escapeHtml(label)}</text>
        <text class="chart-label-sub mono" x="${plotLeft - 10}" y="${cy + 12}" text-anchor="end">${escapeHtml(sub)}</text>
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
      <title id="chart-title">${t("boardChartTitle")}</title>
      <desc id="chart-desc">${t("boardChartDesc")}</desc>
      ${grid}
      <line class="chart-parity" x1="${parityX}" x2="${parityX}" y1="${top - 4}" y2="${height - bottom}" stroke-dasharray="4 3"/>
      <text class="chart-parity-label" x="${parityX + 4}" y="${height - 10}">${t("parityLabel")}</text>
      ${series}
    </svg>
  </figure>`;
}

function renderChartMobile(rows, uniqueMin, uniqueMax) {
  const pad = 8;
  const rightMargin = 40;
  const width = 360 + rightMargin;
  const top = 56;
  const rowH = 62;
  const whiskerY = 42;
  const labelY = 16;
  const height = top + rows.length * rowH + 20;
  const plotW = width - pad - rightMargin;
  const x = (v) => scaleX(v, pad, plotW);
  const plotRight = pad + plotW;

  const ticks = TICKS.map((tick) => {
    const px = x(tick);
    const isMax = tick === AXIS_MAX;
    const tx = isMax ? plotRight : px;
    const anchor = isMax ? "end" : "middle";
    return `<text class="chart-tick chart-tick-mobile" x="${tx}" y="24" text-anchor="${anchor}">${fmtAxisTick(tick)}</text>
      <line class="chart-grid" x1="${px}" x2="${px}" y1="32" y2="${height - 8}"/>`;
  }).join("");

  const parityX = x(1);
  const parity = `<line class="chart-parity" x1="${parityX}" x2="${parityX}" y1="32" y2="${height - 8}" stroke-dasharray="4 3"/>
    <text class="chart-parity-label chart-parity-mobile" x="${parityX + 4}" y="44">${t("parityLabel")}</text>`;

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
        <text class="chart-mobile-name" x="${pad}" y="${rowTop + labelY}">${escapeHtml(row.productName)}</text>
        <text class="chart-mobile-value num" x="${plotRight}" y="${rowTop + labelY}" text-anchor="end">${fmtRatio(row.displayRatio, 2)}</text>
        <text class="chart-mobile-tech mono" x="${pad}" y="${rowTop + labelY + 14}">${escapeHtml(row.technicalId)}</text>
        <line x1="${lo}" x2="${hi}" y1="${cy}" y2="${cy}" class="chart-whisker"/>
        <line x1="${lo}" x2="${lo}" y1="${cy - 5}" y2="${cy + 5}" class="chart-cap"/>
        <line x1="${hi}" x2="${hi}" y1="${cy - 5}" y2="${cy + 5}" class="chart-cap"/>
        <circle class="chart-dot" cx="${dot}" cy="${cy}" r="4.5"/>
      </g>`;
    })
    .join("");

  return `<figure class="chart-wrap chart-mobile">
    <svg class="chart chart-mobile-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-mobile chart-desc-mobile">
      <title id="chart-title-mobile">${t("boardChartTitle")}</title>
      <desc id="chart-desc-mobile">${t("boardChartDesc")}</desc>
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
    <p class="sr-only">${t("chartSrTable")}</p>`;
}

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
  const head = `
    <th scope="col" data-sort="productName">${t("colTool")}<span class="sort" aria-hidden="true"></span></th>
    <th scope="col" class="num" data-sort="displayRatio">${t("colRatio")}<span class="sort" aria-hidden="true"></span></th>
    <th scope="col" class="num col-hide-sm" data-sort="displayLo">${t("colCi")}<span class="sort" aria-hidden="true"></span></th>
    <th scope="col" class="num col-hide-sm" data-sort="displayWord">${t("colWords")}<span class="sort" aria-hidden="true"></span></th>
    <th scope="col" class="num" data-sort="displayRatio">${t("colPer1k")}<span class="sort" aria-hidden="true"></span></th>`;
  const body = sorted
    .map((row) => {
      const tier =
        row.tokenizer === minTok ? "best" : row.tokenizer === maxTok ? "worst" : "";
      const tierLabel =
        row.tokenizer === minTok
          ? t("tierCheapest")
          : row.tokenizer === maxTok
            ? t("tierPriciest")
            : "";
      const ci = `${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}`;
      const per1k = fmtCount(Math.round(1000 * row.displayRatio));
      const title = `${row.tokenizer} @ ${row.revision}`;
      return `<tr class="${tier}" data-tok="${escapeHtml(row.tokenizer)}">
      <td title="${escapeHtml(title)}"><strong>${escapeHtml(row.productName)}</strong>
        <span class="mono muted tech-id">/ ${escapeHtml(row.technicalId)}</span>
        ${tierLabel ? `<span class="tier-label muted"> · ${tierLabel}</span>` : ""}</td>
      <td class="num" data-label="${t("colRatio")}">${fmtRatio(row.displayRatio, 2)}</td>
      <td class="num ci-cell col-hide-sm" data-label="${t("colCi")}">${ci}</td>
      <td class="num col-hide-sm" data-label="${t("colWords")}">${fmt(row.displayWord, 3)}</td>
      <td class="num" data-label="${t("colPer1k")}">${per1k}</td>
    </tr>`;
    })
    .join("");
  return `<div class="table-scroll" role="region" aria-label="${t("boardTableAria")}" tabindex="0">
    <table class="board-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

export function renderMethodSliceTable(data, sliceKey) {
  const rows = sliceRows(data, sliceKey);
  const body = rows
    .map(
      (row) => `<tr>
        <td><strong>${escapeHtml(row.productName)}</strong> <span class="mono muted">/ ${escapeHtml(row.technicalId)}</span></td>
        <td class="num">${fmtRatio(row.displayRatio, 2)}</td>
        <td class="num col-hide-sm">${fmt(row.displayLo, 3)}–${fmt(row.displayHi, 3)}</td>
      </tr>`,
    )
    .join("");
  return `<table class="method-slice-table">
    <thead><tr>
      <th scope="col">${t("colTool")}</th>
      <th scope="col" class="num">${t("colRatio")}</th>
      <th scope="col" class="num col-hide-sm">${t("colCi")}</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}