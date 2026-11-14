"""Gradio app: Indonesian vs English tokenizer cost (tokenizers only, CPU)."""

from __future__ import annotations

import html
import json
from functools import lru_cache
from pathlib import Path

import gradio as gr
import pandas as pd
import plotly.graph_objects as go

from src.encode import Encoder
from src.measure import load_all_encoders

ROOT = Path(__file__).resolve().parent
RESULTS_JSON = ROOT / "results" / "results.json"

TOKEN_PALETTE = ["#cfe8ff", "#ffe3c2", "#d4f0d4", "#f3d4f0", "#fff3b0", "#e0d4ff"]


@lru_cache(maxsize=1)
def get_encoders() -> tuple[Encoder, ...]:
    return tuple(load_all_encoders())


def _read_rows() -> pd.DataFrame:
    if not RESULTS_JSON.exists():
        return pd.DataFrame()
    data = json.loads(RESULTS_JSON.read_text(encoding="utf-8"))
    return pd.DataFrame(data["rows"])


def leaderboard(slice_name: str):
    df = _read_rows()
    if df.empty:
        empty = pd.DataFrame({"message": ["Run python -m src.measure --slice all --out results first."]})
        return empty, go.Figure()
    view = df[df["slice"] == slice_name].copy()
    view = view.sort_values("ratio_id_en")
    table = view[
        [
            "tokenizer",
            "revision",
            "ratio_id_en",
            "ratio_ci_low",
            "ratio_ci_high",
            "extra_tokens_per_1m_en",
            "id_tokens_mean",
            "en_tokens_mean",
            "id_chars_per_token",
            "en_chars_per_token",
            "word_ratio_id_en",
            "id_pct_words_split_ge3",
        ]
    ].rename(
        columns={
            "tokenizer": "Tokenizer",
            "revision": "Revision",
            "ratio_id_en": "ID/EN ratio",
            "ratio_ci_low": "CI low",
            "ratio_ci_high": "CI high",
            "extra_tokens_per_1m_en": "Extra tokens / 1M EN",
            "id_tokens_mean": "ID tokens/sent (mean)",
            "en_tokens_mean": "EN tokens/sent (mean)",
            "id_chars_per_token": "ID chars/token",
            "en_chars_per_token": "EN chars/token",
            "word_ratio_id_en": "ID/EN word ratio",
            "id_pct_words_split_ge3": "% ID words ≥3 tokens",
        }
    )
    fig = go.Figure()
    err_plus = view["ratio_ci_high"] - view["ratio_id_en"]
    err_minus = view["ratio_id_en"] - view["ratio_ci_low"]
    fig.add_trace(
        go.Bar(
            x=view["tokenizer"],
            y=view["ratio_id_en"],
            error_y=dict(
                type="data",
                symmetric=False,
                array=err_plus,
                arrayminus=err_minus,
            ),
            marker_color="#2a6f97",
            name="ID/EN token ratio",
        )
    )
    fig.add_hline(y=1.0, line_dash="dash", line_color="#555", annotation_text="parity")
    fig.update_layout(
        title=f"Indonesian / English token ratio ({slice_name})",
        yaxis_title="sum(ID tokens) / sum(EN tokens)",
        xaxis_title="",
        template="plotly_white",
        margin=dict(l=40, r=20, t=50, b=80),
        height=420,
    )
    fig.update_xaxes(tickangle=-25)
    return table, fig


def _colorize(text: str, encoder: Encoder) -> str:
    pieces = encoder.token_pieces(text)
    if text == "":
        return "<em>empty → 0 tokens</em>"
    if not pieces:
        return html.escape(text)
    spans = []
    for i, piece in enumerate(pieces):
        color = TOKEN_PALETTE[i % len(TOKEN_PALETTE)]
        spans.append(
            f'<span style="background:{color};padding:1px 2px;border-radius:3px;'
            f'margin:0 1px;display:inline-block">{html.escape(piece)}</span>'
        )
    return "".join(spans)


def try_text(id_text: str, en_text: str) -> tuple[pd.DataFrame, str]:
    id_text = id_text or ""
    en_text = en_text or ""
    rows = []
    blocks = []
    for encoder in get_encoders():
        n_id = encoder.n_tokens(id_text)
        n_en = encoder.n_tokens(en_text) if en_text else None
        ratio = (n_id / n_en) if n_en else None
        rows.append(
            {
                "Tokenizer": encoder.name,
                "ID tokens": n_id,
                "EN tokens": n_en,
                "ID/EN": None if ratio is None else round(ratio, 4),
            }
        )
        block = [f"<h4>{html.escape(encoder.name)}</h4>"]
        block.append(f"<p><strong>Indonesian ({n_id} tokens)</strong><br>{_colorize(id_text, encoder)}</p>")
        if en_text:
            block.append(f"<p><strong>English ({n_en} tokens)</strong><br>{_colorize(en_text, encoder)}</p>")
        blocks.append("".join(block))
    table = pd.DataFrame(rows)
    return table, "<hr>".join(blocks)


def build_app() -> gr.Blocks:
    with gr.Blocks(title="Indonesian Token Tax") as demo:
        gr.Markdown(
            """
# Indonesian Token Tax
How many more tokens Indonesian text uses than English, across popular LLM tokenizers.
Ratios are **token multipliers**, not prices. FLORES is formal/news-like; synthetic slices are small.
            """
        )
        with gr.Tabs():
            with gr.Tab("Leaderboard"):
                slice_dd = gr.Dropdown(
                    choices=["flores", "domain", "informal"],
                    value="flores",
                    label="Slice",
                )
                table = gr.Dataframe(label="Per-tokenizer metrics")
                chart = gr.Plot(label="ID/EN ratio with 95% bootstrap CI")
                slice_dd.change(leaderboard, inputs=slice_dd, outputs=[table, chart])
                demo.load(lambda: leaderboard("flores"), outputs=[table, chart])
            with gr.Tab("Try your text"):
                id_box = gr.Textbox(
                    label="Indonesian",
                    lines=4,
                    value="Aku gk sempet ngerjain PR, nanti aja ya.",
                )
                en_box = gr.Textbox(
                    label="English (optional)",
                    lines=4,
                    value="I didn't have time to do the homework; later, okay?",
                )
                run = gr.Button("Tokenize", variant="primary")
                counts = gr.Dataframe(label="Token counts")
                viz = gr.HTML(label="Token boundaries")
                run.click(try_text, inputs=[id_box, en_box], outputs=[counts, viz])
        gr.Markdown(
            "Tokenizers only — no model weights. `add_special_tokens=False`. "
            "See README for method and limitations."
        )
    return demo


demo = build_app()
get_encoders()

if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", server_port=7860, share=False)
