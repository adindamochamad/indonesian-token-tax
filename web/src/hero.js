import { fmtRatio, fmtCount, escapeHtml } from "./format.js";
import { productNameFor, technicalIdFor, tokenizerFromStripShort } from "./specs.js";
import { sliceRows } from "./leaderboard.js";
import { getLang, t } from "./i18n.js";

const O200K = "o200k_base";
const BASELINE_EN = 1000;

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

export function o200kIdTokensAt1k(data) {
  const row = sliceRows(data, "flores").find((r) => r.tokenizer === O200K);
  if (!row) return 1246;
  return Math.round(BASELINE_EN * row.displayRatio);
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
  const lang = getLang();
  const tok = tokenizerFromStripShort(strip.short_name);
  const product = escapeHtml(productNameFor(tok, lang));
  const tech = escapeHtml(strip.tokenizer === "o200k_base" ? "o200k_base" : technicalIdFor(tok));
  const figId = `strip-${strip.short_name.replace(/\s+/g, "-")}`;
  const enBlocks = renderTokenBlocks(strip.en_pieces, "en");
  const idBlocks = renderTokenBlocks(strip.id_pieces, "id");
  return `<figure class="strip-unit" aria-labelledby="${figId}">
    <figcaption id="${figId}" class="strip-caption">
      <strong>${product}</strong> <span class="mono muted">/ ${tech}</span> · ${t("stripsPair", { n: pairIndex })}
    </figcaption>
    <div class="strip-row">
      <span class="strip-lang">${t("stripLangEn")}</span>
      <span class="strip-text muted">${escapeHtml(enText)}</span>
      <span class="strip-count num mono">${strip.en_count}</span>
    </div>
    <div class="strip-blocks strip-blocks-en" aria-hidden="true">${enBlocks}</div>
    <div class="strip-row">
      <span class="strip-lang">${t("stripLangId")}</span>
      <span class="strip-text muted">${escapeHtml(idText)}</span>
      <span class="strip-count num mono">${strip.id_count}</span>
    </div>
    <div class="strip-blocks strip-blocks-id" aria-hidden="true">${idBlocks}</div>
  </figure>`;
}

export function renderMeaningTable(data) {
  const lang = getLang();
  const rows = sliceRows(data, "flores");
  const idAt1k = o200kIdTokensAt1k(data);
  const body = rows
    .map((row) => {
      const per1k = Math.round(BASELINE_EN * row.displayRatio);
      const product = escapeHtml(productNameFor(row.tokenizer, lang));
      const tech = escapeHtml(technicalIdFor(row.tokenizer));
      return `<tr data-tok="${escapeHtml(row.tokenizer)}">
        <td><strong>${product}</strong> <span class="mono muted tech-id">/ ${tech}</span></td>
        <td class="num">${fmtCount(per1k)}</td>
        <td class="num">${fmtRatio(row.displayRatio, 2)}</td>
      </tr>`;
    })
    .join("");
  return `
    <p class="meaning-lead" data-i18n="meaningLead">${t("meaningLead")}</p>
    <p class="meaning-example" id="meaning-example">${t("meaningExample", { idTokens: fmtCount(idAt1k) })}</p>
    <div class="table-scroll">
      <table class="meaning-table" aria-labelledby="meaning-table-caption">
        <caption id="meaning-table-caption" class="sr-only">${t("meaningTableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">${t("meaningColTool")}</th>
            <th scope="col" class="num">${t("meaningColIdPer1k")}</th>
            <th scope="col" class="num">${t("meaningColRatio")}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

export function renderHeroRange(data) {
  const { min, max } = floresRange(data);
  return t("heroRange", { min: fmtRatio(min, 2), max: fmtRatio(max, 2) });
}

export function mountHeroEnhancements(data) {
  const rangeEl = document.getElementById("hero-range");
  if (rangeEl) rangeEl.textContent = renderHeroRange(data);

  const meaning = document.getElementById("meaning-body");
  if (meaning) meaning.innerHTML = renderMeaningTable(data);
}

export async function mountHeroStrip() {
  const wrap = document.getElementById("hero-strip");
  if (!wrap) return;
  try {
    const res = await fetch("hero-strip.json");
    const data = await res.json();
    const strips = data.strips ?? [];
    const pairIndex = data.source?.pair_index ?? 67;
    wrap.innerHTML = strips
      .map((s) => renderStripFigure(s, pairIndex, data.id_text, data.en_text))
      .join("");
  } catch {
    wrap.innerHTML = `<p class="muted">Potongan kata tidak tersedia.</p>`;
  }
}

export function repaintStripsOnLang() {
  mountHeroStrip();
}