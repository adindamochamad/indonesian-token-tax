import pytest

from src.encode import load_tiktoken_encoder
from src.metrics import bootstrap_ratio_ci, extra_tokens_per_million, token_ratio


def test_token_ratio_is_sum_id_over_sum_en() -> None:
    assert token_ratio([2, 4, 6], [1, 2, 3]) == 2.0


def test_token_ratio_drops_zero_english_pairs() -> None:
    assert token_ratio([10, 3], [0, 3]) == 1.0


def test_token_ratio_all_zero_english_is_none() -> None:
    assert token_ratio([1, 2], [0, 0]) is None


def test_empty_lists_ratio_is_none() -> None:
    assert token_ratio([], []) is None


def test_extra_tokens_per_million() -> None:
    assert extra_tokens_per_million(1.25) == 250_000
    assert extra_tokens_per_million(0.8) == pytest.approx(-200_000)
    assert extra_tokens_per_million(None) is None


def test_bootstrap_ci_is_deterministic() -> None:
    id_tokens = [12, 8, 15, 9, 20, 11]
    en_tokens = [10, 10, 12, 8, 16, 9]
    a = bootstrap_ratio_ci(id_tokens, en_tokens, n_resamples=1000, seed=42)
    b = bootstrap_ratio_ci(id_tokens, en_tokens, n_resamples=1000, seed=42)
    assert a == b
    assert a[0] is not None and a[1] is not None
    assert a[0] <= a[1]


def test_bootstrap_ci_changes_with_seed() -> None:
    id_tokens = [12, 8, 15, 9, 20, 11]
    en_tokens = [10, 10, 12, 8, 16, 9]
    a = bootstrap_ratio_ci(id_tokens, en_tokens, seed=42)
    b = bootstrap_ratio_ci(id_tokens, en_tokens, seed=7)
    assert a != b


def test_empty_string_encodes_to_zero_tokens() -> None:
    encoder = load_tiktoken_encoder("cl100k_base")
    assert encoder.n_tokens("") == 0
    assert encoder.token_spans("") == []
    assert encoder.token_pieces("") == []


def test_nonempty_tiktoken_roundtrip_spans() -> None:
    encoder = load_tiktoken_encoder("cl100k_base")
    text = "Sudah makan belum?"
    pieces = encoder.token_pieces(text)
    assert "".join(pieces) == text
    assert encoder.n_tokens(text) == len(pieces) > 0
