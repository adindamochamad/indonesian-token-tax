import { TOKENIZER_SPECS, productNameFor } from "./specs.js";
import { sliceRows, renderChart, renderTable, renderMethodSliceTable } from "./leaderboard.js";
import { mountHeroEnhancements, mountHeroStrip, repaintStripsOnLang } from "./hero.js";
import { initTheme } from "./theme.js";
import { initMotion } from "./motion.js";
import { initLang, t } from "./i18n.js";
import {
  bindExampleChips,
  bindTryCounters,
  loadTryText,
  persistTryText,
  renderExampleChips,
  renderGuessPanel,
  hideGuessPanel,
  renderRankedList,
  renderDetailRow,
} from "./try.js";
import { updateTableScrollFades } from "./table-scroll.js";
import "./styles.css";

const state = {
  data: null,
  sort: { key: "displayRatio", dir: "asc" },
  runtime: null,
  tokenizing: false,
  methodSlice: "flores",
};

async function boot() {
  initLang();
  initTheme();
  const res = await fetch("results.json");
  state.data = await res.json();

  document.getElementById("examples").innerHTML = renderExampleChips();
  const tryOut = document.getElementById("try-out");
  if (tryOut && !document.getElementById("guess-panel")) {
    tryOut.insertAdjacentHTML("afterbegin", renderGuessPanel());
  }

  bind();
  loadTryText();
  bindTryCounters();
  bindExampleChips();
  paintLeaderboard();
  mountHeroEnhancements(state.data);
  window.addEventListener("resize", () => updateTableScrollFades());
  await mountHeroStrip();
  initMotion();

  window.addEventListener("itt:lang", () => {
    document.getElementById("examples").innerHTML = renderExampleChips();
    paintLeaderboard();
    mountHeroEnhancements(state.data);
    repaintStripsOnLang();
    paintMethodSlices();
    if (state.lastTry) paintTryResults(state.lastTry);
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      const dark = document.documentElement.dataset.theme === "dark";
      themeBtn.textContent = dark ? t("themeLight") : t("themeDark");
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get("run") === "1" || params.get("tab") === "try") {
    document.getElementById("try")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (params.get("run") === "1") {
    await onTokenize();
  }
}

function getLangFromDom() {
  return document.documentElement.lang === "en" ? "en" : "id";
}

function bind() {
  document.getElementById("board-table")?.addEventListener("click", (ev) => {
    const th = ev.target.closest("th[data-sort]");
    if (!th) return;
    const key = th.dataset.sort;
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    } else {
      state.sort = { key, dir: "asc" };
    }
    paintLeaderboard();
  });
  document.getElementById("tokenize")?.addEventListener("click", () => onTokenize());
  document.getElementById("show-en")?.addEventListener("change", () => {
    if (state.lastTry) paintTryResults(state.lastTry);
  });
  document.getElementById("id-text")?.addEventListener("keydown", tokenizeShortcut);
  document.getElementById("en-text")?.addEventListener("keydown", tokenizeShortcut);

  document.getElementById("method-slice-group")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-slice]");
    if (!btn) return;
    state.methodSlice = btn.dataset.slice;
    document.querySelectorAll("#method-slice-group button").forEach((b) => {
      b.setAttribute("aria-checked", String(b === btn));
    });
    paintMethodSlices();
  });

  document.getElementById("try-out")?.addEventListener("click", (ev) => {
    const guess = ev.target.closest(".guess-btn");
    if (guess) hideGuessPanel();
  });
}

function tokenizeShortcut(ev) {
  if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
    ev.preventDefault();
    onTokenize();
  }
}

function paintLeaderboard() {
  if (!state.data) return;
  const rows = sliceRows(state.data, "flores");
  document.getElementById("board-chart").innerHTML = renderChart(rows);
  document.getElementById("board-table").innerHTML = renderTable(rows, state.sort);
  requestAnimationFrame(() => updateTableScrollFades());
}

function paintMethodSlices() {
  if (!state.data) return;
  const el = document.getElementById("method-slice-table");
  if (el) el.innerHTML = renderMethodSliceTable(state.data, state.methodSlice);
  requestAnimationFrame(() => updateTableScrollFades());
}

async function getRuntime() {
  if (!state.runtime) {
    state.runtime = await import("./tokenize-runtime.js");
  }
  return state.runtime;
}

async function onTokenize() {
  if (state.tokenizing) return;
  state.tokenizing = true;
  persistTryText();
  hideGuessPanel();
  const idText = document.getElementById("id-text").value;
  const enText = document.getElementById("en-text").value;
  const out = document.getElementById("try-out");
  const runtime = await getRuntime();
  const rows = TOKENIZER_SPECS.map((spec) => ({
    spec,
    status: "waiting",
    idN: null,
    enN: null,
    cpt: null,
    ratio: null,
    idPieces: "",
    enPieces: "",
    error: null,
  }));
  state.lastTry = { rows, showEn: false };
  if (!document.getElementById("try-compare")) {
    out.insertAdjacentHTML("beforeend", `<div id="try-compare"></div><div id="try-details"></div>`);
  }
  paintTryResults(state.lastTry);

  for (let i = 0; i < TOKENIZER_SPECS.length; i += 1) {
    const spec = TOKENIZER_SPECS[i];
    const row = rows[i];
    row.status = "loading";
    paintTryResults({ rows, showEn: document.getElementById("show-en")?.checked });
    try {
      const loaded = await runtime.loadTokenizer(spec);
      const id = runtime.countAndPieces(loaded, idText);
      const en = enText ? runtime.countAndPieces(loaded, enText) : null;
      row.idN = id.n;
      row.enN = en?.n ?? null;
      row.cpt = runtime.charsPerToken(idText, id.n);
      row.ratio = en && en.n ? id.n / en.n : null;
      row.idPieces = runtime.colorizePieces(id.pieces);
      row.enPieces = en ? runtime.colorizePieces(en.pieces) : "";
      row.status = "done";
    } catch (err) {
      row.status = "error";
      row.error = err?.message ?? String(err);
    }
    paintTryResults({ rows, showEn: document.getElementById("show-en")?.checked });
  }
  state.lastTry = { rows, showEn: document.getElementById("show-en")?.checked };
  state.tokenizing = false;
}

function paintTryResults({ rows, showEn }) {
  const compare = document.getElementById("try-compare");
  const details = document.getElementById("try-details");
  if (!compare || !details) return;
  const lang = getLangFromDom();
  const compData = rows
    .filter((r) => r.status === "done")
    .map((r) => ({
      spec: r.spec,
      productName: productNameFor(r.spec.name, lang),
      idN: r.idN,
      enN: r.enN,
      ratio: r.ratio,
    }));
  const maxRatio = Math.max(...compData.map((r) => r.ratio ?? 0), 1.01);
  compare.innerHTML =
    compData.length > 0
      ? `<h2 class="h3 try-compare-title">${t("tryCompareTitle")}</h2>${renderRankedList(compData, maxRatio)}`
      : "";
  details.innerHTML = rows
    .map((r, i) =>
      renderDetailRow(r.spec, r, r.idPieces, r.enPieces, showEn, i === 0),
    )
    .join("");
}

boot().then(() => paintMethodSlices());