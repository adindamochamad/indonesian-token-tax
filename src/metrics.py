"""Pure metric helpers for Indonesian vs English tokenizer comparisons."""

from __future__ import annotations

import math
import re
from typing import Sequence

import numpy as np

WORD_RE = re.compile(r"\w+", re.UNICODE)
BOOTSTRAP_SEED = 42
N_RESAMPLES = 1000


def word_spans(text: str) -> list[tuple[int, int]]:
    return [(m.start(), m.end()) for m in WORD_RE.finditer(text)]


def n_words(text: str) -> int:
    return len(word_spans(text))


def count_words_split_ge3(
    words: Sequence[tuple[int, int]],
    token_spans: Sequence[tuple[int, int]],
) -> tuple[int, int]:
    """Return (n_words_with_ge3_tokens, n_words) using in-sentence offsets."""
    if not words:
        return 0, 0
    n_split = 0
    for w_start, w_end in words:
        overlapping = 0
        for t_start, t_end in token_spans:
            if t_end > w_start and t_start < w_end:
                overlapping += 1
                if overlapping >= 3:
                    n_split += 1
                    break
    return n_split, len(words)


def mean(values: Sequence[float]) -> float | None:
    if not values:
        return None
    return float(np.mean(np.asarray(values, dtype=np.float64)))


def median(values: Sequence[float]) -> float | None:
    if not values:
        return None
    return float(np.median(np.asarray(values, dtype=np.float64)))


def safe_div(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    return numerator / denominator


def token_ratio(id_tokens: Sequence[int], en_tokens: Sequence[int]) -> float | None:
    """Aggregate tax: sum(id) / sum(en) over pairs with at least one English token."""
    id_arr = np.asarray(id_tokens, dtype=np.int64)
    en_arr = np.asarray(en_tokens, dtype=np.int64)
    if id_arr.shape != en_arr.shape:
        raise ValueError("id_tokens and en_tokens must have the same length")
    mask = en_arr > 0
    if not np.any(mask):
        return None
    return float(id_arr[mask].sum() / en_arr[mask].sum())


def bootstrap_ratio_ci(
    id_tokens: Sequence[int],
    en_tokens: Sequence[int],
    *,
    n_resamples: int = N_RESAMPLES,
    seed: int = BOOTSTRAP_SEED,
) -> tuple[float | None, float | None]:
    """95% percentile CI of the aggregate ratio via pair-level resampling."""
    id_arr = np.asarray(id_tokens, dtype=np.int64)
    en_arr = np.asarray(en_tokens, dtype=np.int64)
    if id_arr.shape != en_arr.shape:
        raise ValueError("id_tokens and en_tokens must have the same length")
    mask = en_arr > 0
    id_arr = id_arr[mask]
    en_arr = en_arr[mask]
    n = int(id_arr.size)
    if n == 0:
        return None, None
    rng = np.random.default_rng(seed)
    ratios = np.empty(n_resamples, dtype=np.float64)
    for i in range(n_resamples):
        idx = rng.integers(0, n, size=n)
        en_sum = en_arr[idx].sum()
        if en_sum == 0:
            ratios[i] = math.nan
            continue
        ratios[i] = id_arr[idx].sum() / en_sum
    valid = ratios[~np.isnan(ratios)]
    if valid.size == 0:
        return None, None
    lo, hi = np.percentile(valid, [2.5, 97.5])
    return float(lo), float(hi)


def extra_tokens_per_million(ratio: float | None) -> float | None:
    if ratio is None:
        return None
    return (ratio - 1.0) * 1_000_000
