import { fmt, fmtRatio, wordCount } from "./format.js";
import { shortNameFor } from "./specs.js";

export const EXAMPLES = [
  {
    label: "Formal news",
    id: "Pemerintah mengumumkan langkah baru untuk mengendalikan inflasi tahun ini.",
    en: "The government announced new steps to control inflation this year.",
  },
  {
    label: "Customer support",
    id: "Paket Anda sedang dalam pengiriman dan diperkirakan tiba hari Kamis.",
    en: "Your package is in transit and is expected to arrive on Thursday.",
  },
  {
    label: "Slang",
    id: "Aku gk sempet ngerjain PR, nanti aja ya.",
    en: "I didn't have time to do the homework; later, okay?",
  },
  {
    label: "Code comment",
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
    idMeta.textContent = `${idEl.value.length} chars · ${wordCount(idEl.value)} words`;
  }
  if (enMeta && enEl) {
    enMeta.textContent = `${enEl.value.length} chars · ${wordCount(enEl.value)} words`;
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

export function renderTryShell() {
  const chips = EXAMPLES.map(
    (ex, i) => `<button type="button" class="chip" data-example="${i}">${ex.label}</button>`,
  ).join("");
  return chips;
}

export function renderComparisonRow(spec, idN, enN) {
  const ratio = enN ? idN / enN : null;
  return {
    spec,
    shortName: shortNameFor(spec.name),
    idN,
    enN,
    ratio,
  };
}

export function renderRankedList(rows, maxRatio) {
  const sorted = [...rows].sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0));
  const best = sorted[0]?.ratio;
  const worst = sorted[sorted.length - 1]?.ratio;
  const items = sorted
    .map((r) => {
      const pct = r.ratio == null ? 0 : (r.ratio / maxRatio) * 100;
      const tier =
        r.ratio != null && r.ratio === best
          ? "rank-best"
          : r.ratio != null && r.ratio === worst
            ? "rank-worst"
            : "";
      return `<li class="rank-row ${tier}">
        <span class="rank-name">${r.shortName}</span>
        <span class="rank-bar" role="presentation"><span class="rank-bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="rank-nums num mono"><span class="rank-id">${r.idN}</span> · <span class="rank-en">${r.enN ?? "—"}</span> · <span class="rank-ratio">${r.ratio == null ? "—" : fmtRatio(r.ratio, 2)}</span></span>
      </li>`;
    })
    .join("");
  return `<ol class="try-ranked" aria-label="Token counts ranked by ID/EN ratio">${items}</ol>`;
}

export function renderDetailRow(spec, state, idPieces, enPieces, showEn, open) {
  const { status, error, idN, enN, cpt, ratio } = state;
  const statusHtml =
    status === "loading"
      ? '<span class="status spin" aria-live="polite">Loading…</span>'
      : status === "done"
        ? '<span class="status ok" aria-hidden="true">✓</span>'
        : status === "error"
          ? `<span class="status err">${error ?? "Error"}</span>`
          : '<span class="status">waiting</span>';
  const summary = `ID ${idN ?? "—"} tokens · chars/token ${cpt == null ? "—" : fmt(cpt, 2)}${
    ratio == null ? "" : ` · ID/EN ${fmtRatio(ratio, 2)}`
  }${enN != null ? ` · EN ${enN} tokens` : ""}`;
  return `<details class="try-detail" data-tok="${spec.name}" ${open ? "open" : ""}>
    <summary><span class="try-summary-name">${shortNameFor(spec.name)}</span> ${statusHtml}</summary>
    <p class="meta">${summary}</p>
    <p class="muted small">${spec.name}</p>
    <div class="spans"><strong>Indonesian</strong><div class="span-line">${idPieces ?? ""}</div></div>
    ${
      showEn && enPieces
        ? `<div class="spans"><strong>English</strong><div class="span-line">${enPieces}</div></div>`
        : ""
    }
  </details>`;
}
