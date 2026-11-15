import { TOKENIZER_SPECS } from "./specs.js";
import {
  sliceRows,
  sliceCaveat,
  renderChart,
  renderTable,
  renderCalculator,
  updateCalculator,
} from "./leaderboard.js";
import { renderHero, mountHeroStrip } from "./hero.js";
import { initTheme } from "./theme.js";
import { initMotion } from "./motion.js";
import {
  bindExampleChips,
  bindTryCounters,
  loadTryText,
  persistTryText,
  EXAMPLES,
  renderRankedList,
  renderDetailRow,
} from "./try.js";
import { updateTableScrollFades } from "./table-scroll.js";
import "./styles.css";

const state = {
  data: null,
  sort: { key: "displayRatio", dir: "asc" },
  slice: "flores",
  runtime: null,
  tokenizing: false,
};

async function boot() {
  initTheme();
  const res = await fetch("results.json");
  state.data = await res.json();
  document.getElementById("hero").innerHTML = renderHero(state.data);
  document.getElementById("examples").innerHTML = EXAMPLES.map(
    (ex, i) => `<button type="button" class="chip" data-example="${i}">${ex.label}</button>`,
  ).join("");
  bind();
  loadTryText();
  bindTryCounters();
  bindExampleChips();
  paintLeaderboard();
  window.addEventListener("resize", () => updateTableScrollFades());
  await mountHeroStrip();
  initMotion();

  const params = new URLSearchParams(location.search);
  if (params.get("run") === "1" || params.get("tab") === "try") {
    document.getElementById("try")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (params.get("run") === "1") {
    await onTokenize();
  }
}

function bind() {
  document.getElementById("slice-group")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-slice]");
    if (!btn) return;
    state.slice = btn.dataset.slice;
    document.querySelectorAll("#slice-group button").forEach((b) => {
      b.setAttribute("aria-checked", String(b === btn));
    });
    paintLeaderboard();
  });
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
  document.getElementById("calculator")?.addEventListener("input", (ev) => {
    if (ev.target.id === "en-tokens") updateCalculator();
  });
  document.getElementById("tokenize")?.addEventListener("click", () => onTokenize());
  document.getElementById("show-en")?.addEventListener("change", () => {
    if (state.lastTry) paintTryResults(state.lastTry);
  });
  document.getElementById("id-text")?.addEventListener("keydown", tokenizeShortcut);
  document.getElementById("en-text")?.addEventListener("keydown", tokenizeShortcut);
}

function tokenizeShortcut(ev) {
  if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
    ev.preventDefault();
    onTokenize();
  }
}

function paintLeaderboard() {
  const rows = sliceRows(state.data, state.slice);
  document.getElementById("slice-caveat").textContent = sliceCaveat(state.slice);
  document.getElementById("board-chart").innerHTML = renderChart(rows);
  document.getElementById("board-table").innerHTML = renderTable(rows, state.sort);
  document.getElementById("calculator").innerHTML = renderCalculator(rows);
  const input = document.getElementById("en-tokens");
  if (input) updateCalculator();
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
  const idText = document.getElementById("id-text").value;
  const enText = document.getElementById("en-text").value;
  const showEn = document.getElementById("show-en")?.checked;
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
  out.innerHTML = `<div id="try-compare"></div><div id="try-details"></div>`;
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
  const compData = rows
    .filter((r) => r.status === "done")
    .map((r) => ({
      spec: r.spec,
      shortName: r.spec.shortName,
      idN: r.idN,
      enN: r.enN,
      ratio: r.ratio,
    }));
  const maxRatio = Math.max(...compData.map((r) => r.ratio ?? 0), 1.01);
  compare.innerHTML =
    compData.length > 0
      ? `<h2 class="h3 try-compare-title">Comparison</h2>${renderRankedList(compData, maxRatio)}`
      : "";
  details.innerHTML = rows
    .map((r, i) =>
      renderDetailRow(
        r.spec,
        r,
        r.idPieces,
        r.enPieces,
        showEn,
        i === 0,
      ),
    )
    .join("");
}

boot();