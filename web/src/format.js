import { localeTag } from "./i18n.js";

const formatterCache = new Map();

function numberFormat(options) {
  const tag = localeTag();
  const key = `${tag}:${JSON.stringify(options)}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat(tag, options));
  }
  return formatterCache.get(key);
}

export function clearNumberFormatCache() {
  formatterCache.clear();
}

export function fmt(n, digits = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  return numberFormat({
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n));
}

export function fmtAxisTick(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return numberFormat({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function fmtRatio(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  const num = numberFormat({
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n));
  return `${num}×`;
}

export function fmtInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const rounded = Math.round(n);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  const abs = numberFormat({ maximumFractionDigits: 0 }).format(Math.abs(rounded));
  return sign + abs;
}

export function fmtCount(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return numberFormat({ maximumFractionDigits: 0 }).format(Math.round(n));
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