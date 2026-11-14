"""Tokenizer-agnostic encoding helpers (counts and in-sentence token spans)."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import tiktoken
from huggingface_hub import hf_hub_download
from huggingface_hub.errors import EntryNotFoundError
from tiktoken.load import read_file_cached
from transformers import AutoTokenizer, PreTrainedTokenizerBase

TIKTOKEN_BPE_URLS = {
    "cl100k_base": "https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken",
    "o200k_base": "https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken",
}


class Encoder(Protocol):
    name: str
    repo_id: str
    revision: str
    tokenizer_file_sha256: str
    vocab_file_sha256: str | None

    def n_tokens(self, text: str) -> int: ...

    def token_spans(self, text: str) -> list[tuple[int, int]]: ...

    def token_pieces(self, text: str) -> list[str]: ...


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass
class HfEncoder:
    name: str
    repo_id: str
    revision: str
    tokenizer: PreTrainedTokenizerBase
    tokenizer_file_sha256: str
    vocab_file_sha256: str | None = None

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
    tokenizer_file_sha256: str
    vocab_file_sha256: str | None = None

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
    tok_path = hf_hub_download(repo_id, "tokenizer.json", revision=revision)
    vocab_sha: str | None
    try:
        vocab_path = hf_hub_download(repo_id, "vocab.json", revision=revision)
        vocab_sha = sha256_file(vocab_path)
    except EntryNotFoundError:
        vocab_sha = None
    return HfEncoder(
        name=display_name or repo_id,
        repo_id=repo_id,
        revision=revision,
        tokenizer=tokenizer,
        tokenizer_file_sha256=sha256_file(tok_path),
        vocab_file_sha256=vocab_sha,
    )


def load_tiktoken_encoder(encoding_name: str) -> TiktokenEncoder:
    encoding = tiktoken.get_encoding(encoding_name)
    version = getattr(tiktoken, "__version__", "unknown")
    url = TIKTOKEN_BPE_URLS[encoding_name]
    bpe_bytes = read_file_cached(url)
    return TiktokenEncoder(
        name=encoding_name,
        repo_id=f"tiktoken/{encoding_name}",
        revision=f"tiktoken=={version}",
        encoding=encoding,
        tokenizer_file_sha256=sha256_bytes(bpe_bytes),
        vocab_file_sha256=None,
    )
