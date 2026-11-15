import { getLang, localeTag } from "./i18n.js";

export function fmt(n, digits = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  const loc = localeTag();
  return Number(n).toLocaleString(loc, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtRatio(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  const num = Number(n).toLocaleString(localeTag(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${num}×`;
}

export function fmtInt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const rounded = Math.round(n);
  const loc = localeTag();
  const sign = rounded > 0 ? "+" : rounded < 0 ? (getLang() === "id" ? "−" : "−") : "";
  const abs = Math.abs(rounded).toLocaleString(loc);
  return sign + abs;
}

export function fmtCount(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString(localeTag());
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