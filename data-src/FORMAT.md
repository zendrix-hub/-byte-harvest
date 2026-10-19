# Byte Harvest question-text format (one JSON file per question)

File: `/tmp/bh-qwork/json/<id>.json`, e.g. `2025S_B_Q01.json`. This is the question **exactly as printed** in the
official ITPEC FE booklet. Never include the answer, explanations, or anything not on the page. Drop the
leading "Q1." number; keep everything else (instructions, program text, tables, figures, notes).

```json
{
  "id": "2025S_B_Q01",
  "stem": [ Block, ... ],
  "opts": [ { "k": "a", "b": [ Block, ... ] }, ... ]
}
```
or, when the options are a combination table (common in Subject B, "Answer group" with columns A, B, C):
```json
{
  "id": "2025S_B_Q01",
  "stem": [ Block, ... ],
  "optTable": { "head": ["A", "B", "C"], "rows": [ { "k": "a", "c": ["year mod 100 = 0", "false", "year mod 400 = 0"] }, ... ] }
}
```
Use exactly one of `opts` / `optTable`. If the page prints a caption such as "Answer group" above the options, end the stem with `{ "t": "p", "x": "Answer group" }`. Option letters run a, b, c, … in order; their count must equal the
number printed (it is checked against the answer key's option count).

## Blocks
| Block | Use |
|---|---|
| `{ "t": "p", "x": INLINE }` | A paragraph or sentence. One block per printed paragraph. |
| `{ "t": "code", "x": "line1\nline2" }` | Program / pseudocode / SQL / data listings. Preserve indentation with spaces exactly as printed (2 spaces per level is fine); keep `○`, `←`, `≠`, `≤`, `≥`, `//` comments. Blanks to fill in are written `[[A]]`. Nothing else is interpreted inside code. |
| `{ "t": "table", "rows": [[INLINE, ...], ...], "head": 1 }` | Any printed table. `head` = number of header rows (0 if none). Every row has the same number of cells (use "" for empty cells). |
| `{ "t": "list", "items": [INLINE, ...] }` | A bulleted list. For numbered items like (1) (2) or ① ②, keep the numbers in the text and use `p` blocks or a list. |
| `{ "t": "svg", "svg": "<svg viewBox=…>…</svg>", "alt": "…" }` | Any figure: logic circuit, graph, tree, flowchart, network, Gantt chart, state diagram, Venn diagram, timeline… Redraw it faithfully as clean SVG (see rules). `alt` describes the figure in words. |
| `{ "t": "note", "x": INLINE }` | Small print: footnotes, "[Explanation]" captions, "Note:" lines. |

## INLINE markup (inside `p`, `note`, table cells, list items, option cells)
- `` `x` `` → inline code (variable names, program fragments such as `year mod 4`)
- `**x**` → bold
- `^{x}` → superscript (`2^{10}`), `_{x}` → subscript (`log_{2}`), `~{x}` → overline / NOT (`~{A} · B`)
- `[[A]]` → the boxed blank labelled A (the printed "A" box)
- `\n` → line break
- Everything else is literal text. Use real Unicode: × ÷ ± ≠ ≤ ≥ ← → ↔ √ π Σ ∞ ∩ ∪ ⊂ ∈ ¬ ∧ ∨ ⊕ · ° ‰ µ “ ” ’ – —
- Do NOT use HTML tags or LaTeX.

## SVG rules
- Must start with `<svg` and include `viewBox`; no `width`/`height` attributes needed (it scales to fit, max ~640 px wide).
- Only shapes and text: `g path line polyline polygon rect circle ellipse text tspan defs marker`. No `<script>`, `<foreignObject>`, `<image>`, `on*=` attributes, external links, CSS `@import`, or embedded fonts.
- Colours: ink `#222`, light fill `#f3f3f3`/`#fff`, at most one accent. `font-family="sans-serif"` (or `monospace` for code), font sizes 12–16 in viewBox units for an 800-wide box.
- Use `<marker>` arrowheads for arrows. Keep it legible on a phone; simplify decoration but never drop information (every label, number, node and edge must be there).

## Checks
Run `node /tmp/bh-qwork/tools/validate.mjs <id> [<id> ...]` → must print `OK` for each id.
Run `node /tmp/bh-qwork/tools/render.mjs <id> [<id> ...]` → writes `/tmp/bh-qwork/png/<id>.png`; Read it next to the
original `~/byte-harvest/public/papers/<id>.webp` and compare word by word.
(Before render: `export LD_LIBRARY_PATH=$HOME/.cache/bh-pwlibs/root/usr/lib/x86_64-linux-gnu`.)
