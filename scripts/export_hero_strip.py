"""Export FLORES pair token strips for hero (o200k_base + optional Mistral)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.corpus import load_flores_pairs
from src.encode import load_hf_encoder, load_tiktoken_encoder

OUT = ROOT / "web" / "public" / "hero-strip.json"
TARGET_RATIO = 1.246
EN_MIN, EN_MAX = 12, 25
MISTRAL_REPO = "mistralai/Mistral-7B-Instruct-v0.3"
MISTRAL_REV = "c170c708c41dac9275d15a8fff4eca08d52bab71"


def strip_payload(enc, short_name: str, tokenizer_key: str, id_text: str, en_text: str) -> dict:
    return {
        "tokenizer": tokenizer_key,
        "short_name": short_name,
        "id_pieces": enc.token_pieces(id_text),
        "en_pieces": enc.token_pieces(en_text),
        "id_count": enc.n_tokens(id_text),
        "en_count": enc.n_tokens(en_text),
    }


def pick_pair_index(pairs, o200k) -> int:
    story: list[tuple[float, int, int, int, bool]] = []
    for i, pair in enumerate(pairs):
        en_n = o200k.n_tokens(pair.en_text)
        id_n = o200k.n_tokens(pair.id_text)
        if en_n < EN_MIN or en_n > EN_MAX:
            continue
        ratio = id_n / en_n if en_n else 0.0
        dist = abs(ratio - TARGET_RATIO)
        story_ok = id_n > en_n
        story.append((dist, i, id_n, en_n, story_ok))

    preferred = [t for t in story if t[4]]
    pool = preferred if preferred else story
    if not pool:
        return 0
    pool.sort(key=lambda t: (t[0], t[1]))
    return pool[0][1]


def main() -> int:
    pairs, meta = load_flores_pairs()
    o200k = load_tiktoken_encoder("o200k_base")
    idx = pick_pair_index(pairs, o200k)
    pair = pairs[idx]

    strips = [strip_payload(o200k, "o200k_base", "o200k_base", pair.id_text, pair.en_text)]

    try:
        mistral = load_hf_encoder(MISTRAL_REPO, MISTRAL_REV, display_name="Mistral v0.3")
        strips.append(
            strip_payload(mistral, "Mistral v0.3", MISTRAL_REPO, pair.id_text, pair.en_text)
        )
    except Exception as exc:
        print(f"Mistral strip skipped: {exc}", file=sys.stderr)

    payload = {
        "source": {
            "repo_id": meta["repo_id"],
            "revision": meta["revision"],
            "pair_index": idx,
            "target_ratio": TARGET_RATIO,
            "en_token_range": [EN_MIN, EN_MAX],
        },
        "id_text": pair.id_text,
        "en_text": pair.en_text,
        "strips": strips,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for s in strips:
        print(
            f"pair #{idx} {s['short_name']}: EN {s['en_count']} ID {s['id_count']}",
            file=sys.stderr,
        )
    print(f"Wrote {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())