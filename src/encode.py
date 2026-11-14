"""Tokenizer-agnostic encoding helpers (counts and in-sentence token spans)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import tiktoken
from transformers import AutoTokenizer, PreTrainedTokenizerBase


class Encoder(Protocol):
    name: str
    repo_id: str
    revision: str

    def n_tokens(self, text: str) -> int: ...

    def token_spans(self, text: str) -> list[tuple[int, int]]: ...

    def token_pieces(self, text: str) -> list[str]: ...


@dataclass
class HfEncoder:
    name: str
    repo_id: str
    revision: str
    tokenizer: PreTrainedTokenizerBase

    def n_tokens(self, text: str) -> int:
        if text == "":
            return 0
        return len(self.tokenizer.encode(text, add_special_tokens=False))

    def token_spans(self, text: str) -> list[tuple[int, int]]:
        if text == "":
            return []
        encoded = self.tokenizer(
            text,
            add_special_tokens=False,
            return_offsets_mapping=True,
            return_attention_mask=False,
            return_token_type_ids=False,
        )
        return [(int(s), int(e)) for s, e in encoded["offset_mapping"]]

    def token_pieces(self, text: str) -> list[str]:
        if text == "":
            return []
        spans = self.token_spans(text)
        return [text[s:e] for s, e in spans]


@dataclass
class TiktokenEncoder:
    name: str
    repo_id: str
    revision: str
    encoding: tiktoken.Encoding

    def n_tokens(self, text: str) -> int:
        if text == "":
            return 0
        return len(self.encoding.encode(text))

    def token_spans(self, text: str) -> list[tuple[int, int]]:
        if text == "":
            return []
        tokens = self.encoding.encode(text)
        mapping = _byte_to_char_index(text)
        byte_pos = 0
        spans: list[tuple[int, int]] = []
        for token in tokens:
            piece = self.encoding.decode_single_token_bytes(token)
            n = len(piece)
            start = mapping[byte_pos]
            end = mapping[byte_pos + n]
            spans.append((start, end))
            byte_pos += n
        return spans

    def token_pieces(self, text: str) -> list[str]:
        if text == "":
            return []
        return [text[s:e] for s, e in self.token_spans(text)]


def _byte_to_char_index(text: str) -> list[int]:
    mapping: list[int] = []
    for i, ch in enumerate(text):
        mapping.extend([i] * len(ch.encode("utf-8")))
    mapping.append(len(text))
    return mapping


def load_hf_encoder(repo_id: str, revision: str, display_name: str | None = None) -> HfEncoder:
    tokenizer = AutoTokenizer.from_pretrained(
        repo_id,
        revision=revision,
        use_fast=True,
        trust_remote_code=False,
    )
    if not getattr(tokenizer, "is_fast", False):
        raise RuntimeError(f"{repo_id} did not load a fast tokenizer; offsets would be unavailable")
    return HfEncoder(
        name=display_name or repo_id,
        repo_id=repo_id,
        revision=revision,
        tokenizer=tokenizer,
    )


def load_tiktoken_encoder(encoding_name: str) -> TiktokenEncoder:
    encoding = tiktoken.get_encoding(encoding_name)
    version = getattr(tiktoken, "__version__", "unknown")
    return TiktokenEncoder(
        name=encoding_name,
        repo_id=f"tiktoken/{encoding_name}",
        revision=f"tiktoken=={version}",
        encoding=encoding,
    )
