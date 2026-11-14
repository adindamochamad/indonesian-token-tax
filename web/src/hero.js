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

export function renderHero(data) {
  const { min, max, rows, wordRatio } = floresRange(data);
  const nPairs = Number(data.meta?.slices?.flores?.n_pairs ?? 1012);
  const pairsLabel = nPairs.toLocaleString("en-US");
  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];
  const qwen = data.meta?.tokenizer_files?.find((f) => f.repo_id === "Qwen/Qwen2.5-7B-Instruct");
  const sailor = data.meta?.tokenizer_files?.find((f) => f.repo_id === "sail/Sailor2-8B");
  const vocab = qwen?.vocab_file_sha256?.slice(0, 10) ?? "ca10d7e9fb";

  return `
    <header class="hero">
      <p class="hero-kicker">Indonesian Token Tax</p>
      <h1 class="hero-title">
        Indonesian costs <strong>${fmtRatio(min)}–${fmtRatio(max)}</strong> the tokens of English
      </h1>
      <p class="hero-sub">…even though Indonesian uses ~10% fewer words.</p>
      <ul class="badges" aria-label="Dataset summary">
        <li>7 tokenizers</li>
        <li>${pairsLabel} FLORES pairs</li>
        <li>Runs in your browser</li>
      </ul>
    </header>
    <div class="finding-cards">
      <article class="card">
        <h2>Words vs tokens</h2>
        <p>
          On FLORES-200, Indonesian has a <strong>word</strong> ratio of about
          <strong>${fmtRatio(wordRatio, 2)}</strong> versus English (fewer words), but the
          <strong>token</strong> ratio still runs <strong>${fmtRatio(min, 2)}–${fmtRatio(max, 2)}</strong>.
        </p>
      </article>
      <article class="card">
        <h2>Cheapest vs priciest</h2>
        <p>
          On this slice, <strong>${escapeHtml(shortNameFor(cheapest.tokenizer))}</strong>
          (${fmtRatio(cheapest.displayRatio, 2)}) adds the fewest extra tokens;
          <strong>${escapeHtml(shortNameFor(priciest.tokenizer))}</strong>
          (${fmtRatio(priciest.displayRatio, 2)}) the most.
        </p>
        <p class="muted small">${fmtInt(cheapest.displayExtra)} vs ${fmtInt(priciest.displayExtra)} extra tokens per 1M EN</p>
      </article>
      <article class="card">
        <h2>Qwen2.5 = Sailor2 vocab</h2>
        <p>
          <strong>Qwen2.5</strong> and <strong>Sailor2</strong> share an identical
          <code>vocab.json</code> (SHA-256 <code>${vocab}…</code>) and produced identical token counts here;
          their <code>tokenizer.json</code> hashes differ.
        </p>
      </article>
    </div>`;
}