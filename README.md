---
title: Indonesian Token Tax
emoji: 🇮🇩
colorFrom: green
colorTo: blue
sdk: gradio
sdk_version: 6.32.0
app_file: app.py
pinned: false
license: apache-2.0
---

# Indonesian Token Tax

How many more tokens Indonesian (`id`) costs than English (`en`) on popular LLM tokenizers.

This is a **token-count** comparison on parallel sentences. It is not a quality ranking, not a price table, and not a claim about which model is “better at Indonesian.”

## Method

For each tokenizer and each slice, every sentence pair is encoded as **raw text** with `add_special_tokens=False` (no chat template). Special BOS tokens would add the same constant on both sides for some tokenizers and still distort per-sentence means.

The tax is the **aggregate ratio**:

`ratio = sum(Indonesian tokens) / sum(English tokens)`

Pairs whose English side encodes to 0 tokens are dropped from the ratio (empty strings encode to 0). A bootstrap 95% CI is computed by resampling **pairs** with replacement, 1000 times, `numpy.default_rng(42)` created fresh per tokenizer and slice, then taking the 2.5th and 97.5th percentiles of that same aggregate ratio.

Also reported:

- mean / median tokens per sentence
- characters per token and words per token (fertility); words are Unicode `\w+` spans
- percent of words that overlap ≥3 in-sentence tokens (offset mapping; tiktoken uses byte-accurate piece spans)
- extra tokens per 1M English tokens: `(ratio - 1) * 1_000_000` (signed; no dollar prices)
- mean words per sentence and an ID/EN **word** ratio, so a longer translation is not mistaken for a tokenizer tax

## Corpus

| Slice | Source | n | Notes |
| --- | --- | --- | --- |
| `flores` | [`mteb/flores`](https://huggingface.co/datasets/mteb/flores) revision `69edd3336d102dd184dd531b57defac6c9c60c8f`, split `devtest`, columns `ind_Latn` / `eng_Latn` | 1012 | FLORES-200 devtest via an ungated parquet mirror. Official `facebook/flores` and `openlanguagedata/flores_plus` are gated. |
| `domain` | [`data/domain_pairs.jsonl`](data/domain_pairs.jsonl) | 30 | Synthetic. Chat, customer support, code comments, formal letters. |
| `informal` | [`data/informal_pairs.jsonl`](data/informal_pairs.jsonl) | 20 | Synthetic. Slang/abbreviations (`gk`, `bgt`, `udh`, …) with English glosses. |

## Tokenizers

Loaded from tokenizer files only (`transformers.AutoTokenizer` or `tiktoken`). No model weights.

Used:

- `tiktoken` encodings `cl100k_base` and `o200k_base` (revision recorded as `tiktoken==<version>`)
- `Qwen/Qwen2.5-7B-Instruct`
- `mistralai/Mistral-7B-Instruct-v0.3`
- `sail/Sailor2-8B`
- `deepseek-ai/DeepSeek-V3`
- `aisingapore/Llama-SEA-LION-v3-8B-IT`

Exact repo ids and git SHAs are in [`results/results.json`](results/results.json).

Skipped (license click or remote code):

- `google/gemma-3-1b-it` — gated: manual
- `meta-llama/*` — gated: manual; no ungated official-org tokenizer mirror used
- `CohereForAI/aya-expanse-8b` — gated: auto
- `aisingapore/sea-lion-7b-instruct` — public, but `SEABPETokenizer` needs `trust_remote_code`

## Example numbers (committed `results.csv`)

FLORES-200 `devtest` (`mteb/flores` @ `69edd3336d102dd184dd531b57defac6c9c60c8f`), aggregate ID/EN token ratio with bootstrap 95% CI:

| Tokenizer | Ratio | 95% CI |
| --- | ---: | --- |
| `o200k_base` | 1.246 | 1.235–1.257 |
| `deepseek-ai/DeepSeek-V3` | 1.346 | 1.333–1.358 |
| `aisingapore/Llama-SEA-LION-v3-8B-IT` | 1.538 | 1.524–1.552 |
| `Qwen/Qwen2.5-7B-Instruct` | 1.539 | 1.525–1.554 |
| `sail/Sailor2-8B` | 1.539 | 1.525–1.554 |
| `cl100k_base` | 1.548 | 1.534–1.563 |
| `mistralai/Mistral-7B-Instruct-v0.3` | 1.840 | 1.820–1.861 |

`Qwen/Qwen2.5-7B-Instruct` and `sail/Sailor2-8B` produced identical counts on all three slices in this run (their `vocab.json` blobs match; `tokenizer.json` does not). Informal-slice ratios sit closer to 1.1, but Indonesian has fewer words than the English glosses there (`word_ratio` ≈ 0.66), so that slice is not a clean tokenizer-tax comparison.

## Limitations

- FLORES-200 is professionally translated, news-like, formal. Chat and slang are only the small synthetic slices.
- Synthetic slices are tiny; their CIs are wide. Treat them as illustrations.
- A ratio above 1 can come from the tokenizer **or** from Indonesian using more words than the English reference. Check the word-ratio column.
- Offset-based “% words split into ≥3 tokens” depends on how a tokenizer assigns character spans around spaces.
- This repository does not evaluate generation quality, toxicity, or downstream accuracy.

## Reproduce

CPU only. Tokenizer files are downloaded from Hugging Face / tiktoken; no model weights.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.measure --slice all --out results
python -m pytest -q
python app.py
```

CLI: `python -m src.measure --slice {flores,domain,informal,all} --out results`

## License

Code in this repository is Apache-2.0. FLORES text remains under CC-BY-SA-4.0 of the original FLORES-200 project. Synthetic JSONL files are original to this repo and Apache-2.0.
