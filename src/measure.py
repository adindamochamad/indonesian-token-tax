"""CLI: measure Indonesian vs English token counts across tokenizers."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
from pathlib import Path
from typing import Any

from src.corpus import Pair, iter_slices
from src.encode import Encoder, load_hf_encoder, load_tiktoken_encoder
from src.metrics import (
    extra_tokens_per_million,
    bootstrap_ratio_ci,
    count_words_split_ge3,
    safe_div,
    token_ratio,
    word_spans,
)

HF_TOKENIZERS = [
    {
        "name": "Qwen/Qwen2.5-7B-Instruct",
        "repo_id": "Qwen/Qwen2.5-7B-Instruct",
        "revision": "a09a35458c702b33eeacc393d103063234e8bc28",
    },
    {
        "name": "mistralai/Mistral-7B-Instruct-v0.3",
        "repo_id": "mistralai/Mistral-7B-Instruct-v0.3",
        "revision": "c170c708c41dac9275d15a8fff4eca08d52bab71",
    },
    {
        "name": "sail/Sailor2-8B",
        "repo_id": "sail/Sailor2-8B",
        "revision": "fb9e3b997bd6d39172e247f85eacbf77e5919bd3",
    },
    {
        "name": "deepseek-ai/DeepSeek-V3",
        "repo_id": "deepseek-ai/DeepSeek-V3",
        "revision": "e815299b0bcbac849fa540c768ef21845365c9eb",
    },
    {
        "name": "aisingapore/Llama-SEA-LION-v3-8B-IT",
        "repo_id": "aisingapore/Llama-SEA-LION-v3-8B-IT",
        "revision": "8c47429ff91723eb72dc2845e6d6f47ef6d49e18",
    },
]

SKIPPED = [
    {
        "repo_id": "google/gemma-3-1b-it",
        "reason": "gated: manual (license click required)",
    },
    {
        "repo_id": "meta-llama/*",
        "reason": (
            "gated: manual. No ungated tokenizer under an official Meta org. "
            "SEA-LION v3 is included as an AI Singapore model, not as Meta's tokenizer."
        ),
    },
    {
        "repo_id": "CohereForAI/aya-expanse-8b",
        "reason": "gated: auto (same SHA as CohereLabs/aya-expanse-8b)",
    },
    {
        "repo_id": "aisingapore/sea-lion-7b-instruct",
        "reason": "public but SEABPETokenizer requires trust_remote_code; using Llama-SEA-LION-v3-8B-IT instead",
    },
]

CSV_FIELDS = [
    "slice",
    "tokenizer",
    "repo_id",
    "revision",
    "n_pairs",
    "n_pairs_in_ratio",
    "id_tokens_mean",
    "id_tokens_median",
    "en_tokens_mean",
    "en_tokens_median",
    "ratio_id_en",
    "ratio_ci_low",
    "ratio_ci_high",
    "id_chars_per_token",
    "en_chars_per_token",
    "id_words_per_token",
    "en_words_per_token",
    "id_pct_words_split_ge3",
    "en_pct_words_split_ge3",
    "id_words_mean",
    "en_words_mean",
    "word_ratio_id_en",
    "extra_tokens_per_1m_en",
]


def load_all_encoders() -> list[Encoder]:
    encoders: list[Encoder] = [
        load_tiktoken_encoder("cl100k_base"),
        load_tiktoken_encoder("o200k_base"),
    ]
    for spec in HF_TOKENIZERS:
        print(
            f"Loading tokenizer {spec['repo_id']}@{spec['revision'][:12]}...",
            file=sys.stderr,
            flush=True,
        )
        encoders.append(
            load_hf_encoder(spec["repo_id"], spec["revision"], display_name=spec["name"])
        )
    return encoders


def _stats(values: list[int]) -> tuple[float | None, float | None]:
    if not values:
        return None, None
    return float(statistics.fmean(values)), float(statistics.median(values))


def measure_slice(encoder: Encoder, pairs: list[Pair], slice_name: str) -> dict[str, Any]:
    id_token_counts: list[int] = []
    en_token_counts: list[int] = []
    id_chars = 0
    en_chars = 0
    id_word_counts: list[int] = []
    en_word_counts: list[int] = []
    id_split = 0
    en_split = 0
    id_words_total = 0
    en_words_total = 0
    id_tokens_total = 0
    en_tokens_total = 0

    for pair in pairs:
        id_spans = encoder.token_spans(pair.id_text)
        en_spans = encoder.token_spans(pair.en_text)
        n_id = encoder.n_tokens(pair.id_text)
        n_en = encoder.n_tokens(pair.en_text)
        id_token_counts.append(n_id)
        en_token_counts.append(n_en)
        id_tokens_total += n_id
        en_tokens_total += n_en
        id_chars += len(pair.id_text)
        en_chars += len(pair.en_text)
        id_w = word_spans(pair.id_text)
        en_w = word_spans(pair.en_text)
        id_word_counts.append(len(id_w))
        en_word_counts.append(len(en_w))
        id_words_total += len(id_w)
        en_words_total += len(en_w)
        split_id, _ = count_words_split_ge3(id_w, id_spans)
        id_split += split_id
        split_en, _ = count_words_split_ge3(en_w, en_spans)
        en_split += split_en

    ratio_en = [e for e in en_token_counts if e > 0]
    ratio = token_ratio(id_token_counts, en_token_counts)
    ci_lo, ci_hi = bootstrap_ratio_ci(id_token_counts, en_token_counts)
    id_mean, id_median = _stats(id_token_counts)
    en_mean, en_median = _stats(en_token_counts)
    id_w_mean, _ = _stats(id_word_counts)
    en_w_mean, _ = _stats(en_word_counts)

    return {
        "slice": slice_name,
        "tokenizer": encoder.name,
        "repo_id": encoder.repo_id,
        "revision": encoder.revision,
        "n_pairs": len(pairs),
        "n_pairs_in_ratio": len(ratio_en),
        "id_tokens_mean": id_mean,
        "id_tokens_median": id_median,
        "en_tokens_mean": en_mean,
        "en_tokens_median": en_median,
        "ratio_id_en": ratio,
        "ratio_ci_low": ci_lo,
        "ratio_ci_high": ci_hi,
        "id_chars_per_token": safe_div(id_chars, id_tokens_total),
        "en_chars_per_token": safe_div(en_chars, en_tokens_total),
        "id_words_per_token": safe_div(id_words_total, id_tokens_total),
        "en_words_per_token": safe_div(en_words_total, en_tokens_total),
        "id_pct_words_split_ge3": safe_div(100.0 * id_split, id_words_total),
        "en_pct_words_split_ge3": safe_div(100.0 * en_split, en_words_total),
        "id_words_mean": id_w_mean,
        "en_words_mean": en_w_mean,
        "word_ratio_id_en": safe_div(id_words_total, en_words_total),
        "extra_tokens_per_1m_en": extra_tokens_per_million(ratio),
    }


def write_outputs(rows: list[dict[str, Any]], meta: dict[str, Any], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "results.csv"
    json_path = out_dir / "results.json"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k) for k in CSV_FIELDS})
    payload = {"meta": meta, "rows": rows}
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {csv_path} and {json_path}", file=sys.stderr)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Measure Indonesian token tax vs English.")
    parser.add_argument(
        "--slice",
        choices=["flores", "domain", "informal", "all"],
        default="all",
        help="Which parallel slice to measure.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("results"),
        help="Output directory for results.csv and results.json.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    encoders = load_all_encoders()
    rows: list[dict[str, Any]] = []
    slice_meta: dict[str, Any] = {}
    for slice_name, pairs, meta in iter_slices(args.slice):
        slice_meta[slice_name] = meta
        print(f"Measuring slice={slice_name} n={len(pairs)}", file=sys.stderr)
        for encoder in encoders:
            print(f"  {encoder.name}", file=sys.stderr)
            rows.append(measure_slice(encoder, pairs, slice_name))
    meta = {
        "skipped_tokenizers": SKIPPED,
        "slices": slice_meta,
        "encode": {
            "add_special_tokens": False,
            "chat_template": False,
            "bootstrap_resamples": 1000,
            "bootstrap_seed": 42,
        },
    }
    write_outputs(rows, meta, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
