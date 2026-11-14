export function fmt(n, digits = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

export function fmtRatio(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(digits)}×`;
}

export function fmtInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(Math.round(n));
  return sign + abs.toLocaleString("en-US");
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function wordCount(text) {
  if (!text.trim()) return 0;
  return (text.match(/\w+/gu) ?? []).length;
}