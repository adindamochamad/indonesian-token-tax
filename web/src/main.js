import { TOKENIZER_SPECS, loadTokenizer, countAndPieces, charsPerToken } from "./tokenizers.js";
import { sliceRows, renderTable, renderChart, colorize, fmt } from "./leaderboard.js";
import "./styles.css";

const state = { data: null };

async function boot() {
  const res = await fetch("results.json");
  state.data = await res.json();
  bind();
  paintLeaderboard();
  const params = new URLSearchParams(location.search);
  if (params.get("tab") === "try") {
    document.querySelector('[data-panel="try"]')?.click();
  }
  if (params.get("run") === "1") {
    await onTokenize();
  }
}

function bind() {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.panel));
    });
  });
  document.getElementById("slice").addEventListener("change", paintLeaderboard);
  document.getElementById("tokenize").addEventListener("click", onTokenize);
}

function paintLeaderboard() {
  const slice = document.getElementById("slice").value;
  const rows = sliceRows(state.data, slice);
  document.getElementById("board-table").innerHTML = renderTable(rows);
  document.getElementById("board-chart").innerHTML = renderChart(rows);
}

function setTryStatus(name, status) {
  const el = document.querySelector(`[data-tok="${CSS.escape(name)}"] .status`);
  if (el) el.textContent = status;
}

async function onTokenize() {
  const idText = document.getElementById("id-text").value;
  const enText = document.getElementById("en-text").value;
  const out = document.getElementById("try-out");
  out.innerHTML = TOKENIZER_SPECS.map(
    (spec) => `<article class="try-row" data-tok="${spec.name}">
      <h3>${spec.name}</h3>
      <div class="status">waiting</div>
    </article>`,
  ).join("");

  for (const spec of TOKENIZER_SPECS) {
    setTryStatus(spec.name, "loading tokenizer files…");
    const loaded = await loadTokenizer(spec, setTryStatus);
    const id = countAndPieces(loaded, idText);
    const en = enText ? countAndPieces(loaded, enText) : null;
    const cpt = charsPerToken(idText, id.n);
    const ratio = en && en.n ? id.n / en.n : null;
    const article = document.querySelector(`[data-tok="${CSS.escape(spec.name)}"]`);
    article.innerHTML = `<h3>${spec.name}</h3>
      <div class="meta">ID ${id.n} tokens · chars/token ${cpt == null ? "—" : fmt(cpt, 2)}${
        ratio == null ? "" : ` · ID/EN ${fmt(ratio, 4)}`
      }${en ? ` · EN ${en.n} tokens` : ""}</div>
      <div class="spans"><strong>Indonesian</strong><br>${colorize(id.pieces)}</div>
      ${en ? `<div class="spans"><strong>English</strong><br>${colorize(en.pieces)}</div>` : ""}`;
  }
}

boot();
