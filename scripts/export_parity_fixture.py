"""Export first 50 FLORES ID + 50 EN sentences and Python token counts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.corpus import load_flores_pairs
from src.measure import load_all_encoders

OUT = ROOT / "web" / "fixtures" / "parity.json"
N = 50


def main() -> int:
    pairs, meta = load_flores_pairs()
    id_texts = [p.id_text for p in pairs[:N]]
    en_texts = [p.en_text for p in pairs[:N]]
    encoders = load_all_encoders()
    counts: dict[str, dict[str, list[int]]] = {}
    for encoder in encoders:
        counts[encoder.name] = {
            "id": [encoder.n_tokens(t) for t in id_texts],
            "en": [encoder.n_tokens(t) for t in en_texts],
        }
        print(encoder.name, "id_sum", sum(counts[encoder.name]["id"]), file=sys.stderr)
    payload = {
        "source": {
            "repo_id": meta["repo_id"],
            "revision": meta["revision"],
            "split": meta["split"],
            "n": N,
            "note": "First 50 Indonesian and first 50 English sentences of FLORES-200 devtest.",
        },
        "id_texts": id_texts,
        "en_texts": en_texts,
        "python_counts": counts,
        "encode": {"add_special_tokens": False},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
