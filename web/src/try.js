import { fmt, fmtRatio, wordCount } from "./format.js";
import { productNameFor, technicalIdFor } from "./specs.js";
import { uniqueExtremeRatios, rowAccentClass } from "./accent.js";
import { getLang, t } from "./i18n.js";

export const EXAMPLES = [
  {
    labelKey: "exFormal",
    id: "Pemerintah mengumumkan langkah baru untuk mengendalikan inflasi tahun ini.",
    en: "The government announced new steps to control inflation this year.",
  },
  {
    labelKey: "exSupport",
    id: "Paket Anda sedang dalam pengiriman dan diperkirakan tiba hari Kamis.",
    en: "Your package is in transit and is expected to arrive on Thursday.",
  },
  {
    labelKey: "exSlang",
    id: "Aku gk sempet ngerjain PR, nanti aja ya.",
    en: "I didn't have time to do the homework; later, okay?",
  },
  {
    labelKey: "exCode",
    id: "# Jika status 429, tunggu backoff eksponensial lalu coba lagi.",
    en: "# If the status is 429, wait with exponential backoff and retry.",
  },
];

const LS_ID = "itt-id-text";
const LS_EN = "itt-en-text";

export function loadTryText() {
  const id = localStorage.getItem(LS_ID);
  const en = localStorage.getItem(LS_EN);
  const idEl = document.getElementById("id-text");
  const enEl = document.getElementById("en-text");
  if (id && idEl) idEl.value = id;
  if (en && enEl) enEl.value = en;
}

export function persistTryText() {
  const idEl = document.getElementById("id-text");
  const enEl = document.getElementById("en-text");
  if (idEl) localStorage.setItem(LS_ID, idEl.value);
  if (enEl) localStorage.setItem(LS_EN, enEl.value);
}

export function updateTryMeta() {
  const idEl = document.getElementById("id-text");
  const enEl = document.getElementById("en-text");
  const idMeta = document.getElementById("id-meta");
  const enMeta = document.getElementById("en-meta");
  if (idMeta && idEl) {
    idMeta.textContent = t("fieldMeta", { chars: idEl.value.length, words: wordCount(idEl.value) });
  }
  if (enMeta && enEl) {
    enMeta.textContent = t("fieldMeta", { chars: enEl.value.length, words: wordCount(enEl.value) });
  }
  persistTryText();
}

export function bindTryCounters() {
  const idEl = document.getElementById("id-text");
  const enEl = document.getElementById("en-text");
  idEl?.addEventListener("input", updateTryMeta);
  enEl?.addEventListener("input", updateTryMeta);
  updateTryMeta();
}

export function bindExampleChips() {
  document.getElementById("examples")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-example]");
    if (!btn) return;
    const ex = EXAMPLES[Number(btn.dataset.example)];
    if (!ex) return;
    document.getElementById("id-text").value = ex.id;
    document.getElementById("en-text").value = ex.en;
    updateTryMeta();
  });
}

export function renderExampleChips() {
  return EXAMPLES.map(
    (ex, i) =>
      `<button type="button" class="chip" data-example="${i}" data-i18n="${ex.labelKey}">${t(ex.labelKey)}</button>`,
  ).join("");
}

export function renderGuessPanel() {
  return `<div class="guess-panel" id="guess-panel">
    <p class="guess-prompt">${t("guessPrompt")}</p>
    <div class="guess-options" role="group" aria-labelledby="guess-prompt">
      <button type="button" class="chip guess-btn" data-guess="same">${t("guessSame")}</button>
      <button type="button" class="chip guess-btn" data-guess="mid">${t("guessMid")}</button>
      <button type="button" class="chip guess-btn" data-guess="high">${t("guessHigh")}</button>
    </div>
  </div>`;
}

export function hideGuessPanel() {
  document.getElementById("guess-panel")?.classList.add("is-hidden");
}

export function renderRankedList(rows, maxRatio) {
  const lang = getLang();
  const sorted = [...rows].sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0));
  const { uniqueMin, uniqueMax } = uniqueExtremeRatios(sorted, (r) => r.ratio);
  const items = sorted
    .map((r) => {
      const name = r.productName ?? productNameFor(r.spec?.name ?? r.spec, lang);
      const pct = r.ratio == null ? 0 : (r.ratio / maxRatio) * 100;
      const accent = rowAccentClass(r.ratio, uniqueMin, uniqueMax);
      const tier =
        accent === "accent-cheapest" ? "rank-best" : accent === "accent-priciest" ? "rank-worst" : "";
      const nums = `ID ${r.idN} · EN ${r.enN ?? "—"} · ${r.ratio == null ? "—" : fmtRatio(r.ratio, 2)}`;
      return `<li class="rank-row ${tier}">
        <span class="rank-name">${name}</span>
        <span class="rank-bar" role="presentation"><span class="rank-bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="rank-nums num mono" aria-label="${nums}">${nums}</span>
      </li>`;
    })
    .join("");
  return `<p id="try-ranked-head" class="sr-only">${t("tryRankSr")}</p>
    <ol class="try-ranked" aria-labelledby="try-ranked-head">${items}</ol>`;
}

export function renderDetailRow(spec, state, idPieces, enPieces, showEn, open) {
  const lang = getLang();
  const { status, error, idN, enN, cpt, ratio } = state;
  const product = productNameFor(spec.name, lang);
  const tech = technicalIdFor(spec.name);
  const statusHtml =
    status === "loading"
      ? `<span class="status spin" aria-live="polite">${t("statusLoading")}</span>`
      : status === "done"
        ? '<span class="status ok" aria-hidden="true">✓</span>'
        : status === "error"
          ? `<span class="status err">${error ?? "Error"}</span>`
          : `<span class="status">${t("statusWaiting")}</span>`;
  const summary = `ID ${idN ?? "—"} · ${cpt == null ? "—" : fmt(cpt, 2)} ${t("charsPerToken")}${
    ratio == null ? "" : ` · ${fmtRatio(ratio, 2)}`
  }${enN != null ? ` · EN ${enN}` : ""}`;
  return `<details class="try-detail" data-tok="${spec.name}" ${open ? "open" : ""}>
    <summary><span class="try-summary-name">${product}</span> <span class="mono muted small">/ ${tech}</span> ${statusHtml}</summary>
    <p class="meta">${summary}</p>
    <div class="spans"><strong>${t("indonesianPieces")}</strong><div class="span-line">${idPieces ?? ""}</div></div>
    ${
      showEn && enPieces
        ? `<div class="spans"><strong>${t("englishPieces")}</strong><div class="span-line">${enPieces}</div></div>`
        : ""
    }
  </details>`;
}