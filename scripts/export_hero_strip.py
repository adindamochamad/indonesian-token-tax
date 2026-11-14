"""Export fixed FLORES pair token pieces for hero strip (o200k_base)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.corpus import load_flores_pairs
from src.encode import load_tiktoken_encoder

OUT = ROOT / "web" / "public" / "hero-strip.json"


def main() -> int:
    pairs, meta = load_flores_pairs()
    pair = pairs[0]
    enc = load_tiktoken_encoder("o200k_base")
    payload = {
        "source": {
            "repo_id": meta["repo_id"],
            "revision": meta["revision"],
            "pair_index": 0,
            "tokenizer": "o200k_base",
        },
        "id_text": pair.id_text,
        "en_text": pair.en_text,
        "id_pieces": enc.token_pieces(pair.id_text),
        "en_pieces": enc.token_pieces(pair.en_text),
        "id_count": enc.n_tokens(pair.id_text),
        "en_count": enc.n_tokens(pair.en_text),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())