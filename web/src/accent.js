/** Accent cheapest/priciest only when exactly one row holds that extreme ratio. */
export function uniqueExtremeRatios(items, getRatio) {
  const pairs = items
    .map((item) => ({ item, ratio: getRatio(item) }))
    .filter((x) => x.ratio != null && Number.isFinite(x.ratio));
  if (pairs.length === 0) {
    return { uniqueMin: null, uniqueMax: null };
  }
  const values = pairs.map((p) => p.ratio);
  const accentMin = Math.min(...values);
  const accentMax = Math.max(...values);
  const minCount = values.filter((v) => v === accentMin).length;
  const maxCount = values.filter((v) => v === accentMax).length;
  return {
    uniqueMin: minCount === 1 ? accentMin : null,
    uniqueMax: maxCount === 1 ? accentMax : null,
  };
}

export function rowAccentClass(ratio, uniqueMin, uniqueMax) {
  if (ratio == null || !Number.isFinite(ratio)) return "";
  if (uniqueMin != null && ratio === uniqueMin) return "accent-cheapest";
  if (uniqueMax != null && ratio === uniqueMax) return "accent-priciest";
  return "";
}

export function leaderboardAccentTokenizers(rows) {
  const { uniqueMin, uniqueMax } = uniqueExtremeRatios(rows, (r) => r.displayRatio);
  const minTok =
    uniqueMin != null ? rows.find((r) => r.displayRatio === uniqueMin)?.tokenizer : null;
  const maxTok =
    uniqueMax != null ? rows.find((r) => r.displayRatio === uniqueMax)?.tokenizer : null;
  return { minTok, maxTok };
}