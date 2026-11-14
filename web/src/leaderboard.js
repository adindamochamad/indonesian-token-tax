const PALETTE = ["#cfe8ff", "#ffe3c2", "#d4f0d4", "#f3d4f0", "#fff3b0", "#e0d4ff"];

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
      };
    })
    .sort((a, b) => a.displayRatio - b.displayRatio);
}

export function fmt(n, digits = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

export function renderTable(rows) {
  const body = rows
    .map(
      (row) => `<tr>
      <td>${escapeHtml(row.tokenizer)}</td>
      <td class="num">${fmt(row.displayRatio)}</td>
      <td class="num">${fmt(row.displayLo)}–${fmt(row.displayHi)}</td>
      <td class="num">${fmt(row.displayWord)}</td>
      <td class="num">${fmt(row.displayExtra, 0)}</td>
    </tr>`,
    )
    .join("");
  return `<table>
    <thead><tr>
      <th>Tokenizer</th><th class="num">ID/EN tokens</th><th class="num">95% CI</th>
      <th class="num">ID/EN words</th><th class="num">Extra / 1M EN</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function renderChart(rows) {
  const width = 900;
  const rowH = 36;
  const left = 280;
  const right = 36;
  const top = 16;
  const height = top + rows.length * rowH + 28;
  const plotW = width - left - right;
  const maxX = Math.max(2, ...rows.map((r) => r.displayHi || r.displayRatio || 0));
  const x = (v) => left + (v / maxX) * plotW;
  const bars = rows
    .map((row, i) => {
      const y = top + i * rowH + 8;
      const x0 = x(0);
      const x1 = x(row.displayRatio);
      const lo = x(row.displayLo);
      const hi = x(row.displayHi);
      return `<g>
        <text x="${left - 10}" y="${y + 12}" text-anchor="end" font-size="12">${escapeHtml(shortName(row.tokenizer))}</text>
        <rect x="${Math.min(x0, x1)}" y="${y}" width="${Math.abs(x1 - x0)}" height="16" fill="#2a6f97"/>
        <line x1="${lo}" x2="${hi}" y1="${y + 8}" y2="${y + 8}" stroke="#1c1b19" stroke-width="1.5"/>
        <line x1="${lo}" x2="${lo}" y1="${y + 3}" y2="${y + 13}" stroke="#1c1b19"/>
        <line x1="${hi}" x2="${hi}" y1="${y + 3}" y2="${y + 13}" stroke="#1c1b19"/>
      </g>`;
    })
    .join("");
  const parityX = x(1);
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="ID over EN token ratio">
    <line x1="${parityX}" x2="${parityX}" y1="${top}" y2="${height - 20}" stroke="#888" stroke-dasharray="4 4"/>
    ${bars}
    <text x="${parityX + 4}" y="${height - 6}" font-size="11" fill="#5b574f">parity = 1</text>
  </svg>`;
}

export function colorize(pieces) {
  if (!pieces.length) return "<em>empty → 0 tokens</em>";
  return pieces
    .map((piece, i) => {
      const color = PALETTE[i % PALETTE.length];
      return `<span style="background:${color}">${escapeHtml(piece)}</span>`;
    })
    .join("");
}

function shortName(name) {
  return name.replace("mistralai/", "").replace("aisingapore/", "").replace("deepseek-ai/", "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
