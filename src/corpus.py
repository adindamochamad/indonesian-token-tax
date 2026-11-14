"""Parallel Indonesian/English corpus loaders."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from datasets import load_dataset

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

FLORES_REPO = "mteb/flores"
FLORES_REVISION = "69edd3336d102dd184dd531b57defac6c9c60c8f"
FLORES_SPLIT = "devtest"
FLORES_ID_COL = "ind_Latn"
FLORES_EN_COL = "eng_Latn"


@dataclass(frozen=True)
class Pair:
    id_text: str
    en_text: str
    slice_name: str
    synthetic: bool
    domain: str | None = None


def load_jsonl_pairs(path: Path, slice_name: str) -> list[Pair]:
    pairs: list[Pair] = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            pairs.append(
                Pair(
                    id_text=row["id_text"],
                    en_text=row["en_text"],
                    slice_name=slice_name,
                    synthetic=bool(row.get("synthetic", True)),
                    domain=row.get("domain"),
                )
            )
    return pairs


def load_domain_pairs() -> list[Pair]:
    return load_jsonl_pairs(DATA_DIR / "domain_pairs.jsonl", "domain")


def load_informal_pairs() -> list[Pair]:
    return load_jsonl_pairs(DATA_DIR / "informal_pairs.jsonl", "informal")


def load_flores_pairs() -> tuple[list[Pair], dict[str, str]]:
    dataset = load_dataset(
        FLORES_REPO,
        split=FLORES_SPLIT,
        revision=FLORES_REVISION,
    )
    pairs = [
        Pair(
            id_text=row[FLORES_ID_COL],
            en_text=row[FLORES_EN_COL],
            slice_name="flores",
            synthetic=False,
            domain="flores200_devtest",
        )
        for row in dataset
    ]
    meta = {
        "repo_id": FLORES_REPO,
        "revision": FLORES_REVISION,
        "split": FLORES_SPLIT,
        "id_column": FLORES_ID_COL,
        "en_column": FLORES_EN_COL,
        "n_pairs": str(len(pairs)),
        "note": (
            "FLORES-200 devtest via the ungated mteb/flores parquet mirror. "
            "Official facebook/flores and openlanguagedata/flores_plus are gated."
        ),
    }
    return pairs, meta


SLICE_LOADERS = {
    "flores": load_flores_pairs,
    "domain": lambda: (load_domain_pairs(), {"source": "data/domain_pairs.jsonl", "synthetic": True}),
    "informal": lambda: (load_informal_pairs(), {"source": "data/informal_pairs.jsonl", "synthetic": True}),
}


def iter_slices(which: str) -> Iterator[tuple[str, list[Pair], dict]]:
    names = ["flores", "domain", "informal"] if which == "all" else [which]
    for name in names:
        if name not in SLICE_LOADERS:
            raise ValueError(f"Unknown slice: {name}")
        pairs, meta = SLICE_LOADERS[name]()
        yield name, pairs, meta
