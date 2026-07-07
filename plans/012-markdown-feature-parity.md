---
title: Markdown feature parity (footnotes, autolinks, math, highlight, raw HTML, reference links, callouts)
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-07
updated: 2026-07-07
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/615
related_issues: []
---

# Markdown feature parity

## Summary

Bangle's editor covers CommonMark's core blocks plus GFM tables, task lists,
strikethrough, and (as of PR #615) YAML frontmatter. An empirical
parse→serialize probe against the real `markdownLoader` stack (2026-07-07)
shows the remaining gap splits into two very different problems:

1. **Constructs we actively mangle on save.** Opening a note that uses them
   and saving rewrites the source. These violate the Markdown-fidelity
   priority and come first.
2. **Constructs we merely don't render.** They round-trip byte-for-byte as
   plain text. These are feature work and can be sequenced by value.

This plan covers both, one milestone per construct, all following the
architecture proven by the frontmatter work: an engine-neutral tokenizer rule
in `@bangle.io/markdown-syntax`, a self-contained collection in
`banger-editor`, wiring in `packages/core/editor/src/extensions.ts`, and
round-trip tests at every layer.

## Current behavior (probe results, 2026-07-07)

Mutating on save today:

| Construct | Input → output |
| --- | --- |
| Footnotes | `text[^1]` → `text\[^1\]` (escaped; visible corruption) |
| Reference links | `[foo][ref]` + `[ref]: url "T"` → inlined `[foo](url "T")`; definition destroyed |
| Single-tilde strike (GFM) | `~x~` → `\~x\~` |
| HTML entities | `&amp;` `&copy;` → literal `&` `©` |
| Math block | `$$\nx^2\n$$` → `$$ x^2 $$` (soft break collapsed) |
| Definition lists | `term\n: def` → `term : def` |

Round-tripping safely as plain text (unrendered): raw HTML (tokenizer runs
`html: false`), bare URLs, `==highlight==`, `$inline math$`, `:emoji:`,
`> [!note]` callouts (render as plain blockquotes).

Already supported and verified: tables with alignment, task lists, `~~strike~~`,
setext→ATX normalization, both hard-break forms, angle autolinks, link titles,
indented + fenced code, frontmatter.

## Reference implementations studied

Local checkouts of these open-source ProseMirror/tiptap editors were surveyed;
paths below are repo-relative in each upstream project.

- **GitLab content editor** — the most complete fidelity story.
  Footnotes: `content_editor/extensions/footnote_reference.js`,
  `footnote_definition.js`, `footnotes_section.js` (inline atom reference +
  block definition + grouping section). Reference links:
  `extensions/link.js` (`isReference`, `canonicalSrc` attrs) +
  `extensions/reference_definition.js` (definitions are real block nodes
  serialized verbatim). Callouts: `extensions/alert.js` extends blockquote
  with a `type` attr plus an `alertTitle` child, serializing `> [!note]`.
  Autolinks: `services/serializer/link.js` decides *at serialization time* —
  a link whose text equals its normalized href and matches the GFM autolink
  grammar is emitted as a bare URL, not `[x](x)`. Raw HTML: a curated
  safe subset of inline marks (`ins`, `abbr`, `kbd`, `span`, …) and block
  nodes (`div`, `pre`) in `extensions/html_marks.js` / `html_nodes.js`, plus
  a general `preserveUnchanged` sourcemap mechanism that re-emits original
  source for untouched nodes.
- **Milkdown** — remark-based. Footnotes via `remark-gfm` with the same
  two-node shape (`preset-gfm/src/node/footnote/`). Math via `remark-math`
  (`crepe/src/feature/latex/`), inline atom node with `value` attr + KaTeX.
  Raw HTML preserved via a dedicated value-carrying inline `html` node
  (`preset-commonmark/src/node/html.ts`) that serializes its stored source
  verbatim — the cleanest "preserve without rendering" model.
- **Nextcloud Text** — markdown-it based like us; runs `html: false` (the
  same safety posture we have) and uses `markdown-it-container` for
  parse-only callouts (no serialization — a cautionary example: parse-only
  support breaks round trips).
- **Tiptap** (`extension-mathematics`, `extension-highlight`) — inline/block
  math as atom nodes with a `latex` attr and lazy KaTeX node views;
  highlight as a `<mark>` mark with `==` delimiters.
- **Outline** — highlight mark with proper prosemirror-markdown serialization
  (`open/close: "=="`, `mixable: true`) — the closest match to our
  serializer stack.
- **Novel / Remirror** — linkify-style typing-time autolinking
  (`linkifyjs`); Remirror's highlight has no markdown story (avoid copying).

Notable negative results: no surveyed project solves footnote
auto-renumbering (GitLab and Milkdown both carry TODOs); Nextcloud inlines
reference links exactly like we do today.

## Architecture blueprint (applies to every milestone)

1. **Tokenizer** — add the markdown-it rule to `@bangle.io/markdown-syntax`
   (hand-rolled, like `wiki-link-syntax.ts` and `frontmatter-syntax.ts`,
   preferring small explicit rules over third-party plugins). Every rule must
   decline rather than guess; unparseable input keeps its CommonMark meaning.
2. **Collection** — node/mark + commands + keymaps + `markdown`
   (`toMarkdown`/`parseMarkdown` + `tokenizerPlugins`) in a new
   `banger-editor` module, exported through `prosemirror-plugins`.
3. **Wiring** — register in `packages/core/editor/src/extensions.ts`; slash
   menu / input rules where discoverability matters; CSS in `typography.css`.
4. **Consumer alignment** — any new syntax that changes what token a `[[…]]`
   or link can appear in must also be added to
   `backlink-markdown-extractor.ts` (the tokenizer-alignment invariant).
5. **Tests, pyramid-weighted** — tokenizer accept/decline matrix; collection
   command/keymap specs; exact-string round-trip specs in
   `packages/core/editor/src/__tests__/`; one thin Playwright E2E per
   user-visible feature. Every intentional normalization asserted visibly.

## Milestones (fidelity first)

### M1 — Footnotes `[^1]` / `[^1]: definition`

The only construct we *corrupt* (escaping brackets), and high-value for
notes. Follow the GitLab/Milkdown two-node shape:

- `footnote_reference`: inline atom, `label` attr, renders `<sup>`.
- `footnote_definition`: block, `label` attr, `content: 'block+'`,
  `defining: true`; serialize at document end as `[^label]: …`.
- Tokenizer: block rule for definitions, inline rule for references, in
  `markdown-syntax`. Reference-without-definition (and vice versa) must
  round-trip rather than error.
- Out of scope: automatic renumbering on insert/delete (no reference project
  has solved it; labels are stable identifiers, not display order).

### M2 — GFM autolinks (bare URLs)

- Parse: enable markdown-it `linkify` in the base tokenizer (this changes the
  shared token stream — verify the backlink extractor counts a bare-URL link
  as a markdown link target, and add a spec).
- Serialize: adopt GitLab's rule — a link mark whose text equals its href
  (normalized) and matches the autolink grammar serializes as the bare URL.
  Without this, every bare URL is rewritten to `[url](url)` on save, trading
  one fidelity bug for another.
- Optional follow-up: typing-time linkify (tiptap/novel use `linkifyjs`); not
  required for fidelity.

### M3 — Highlight mark `==text==`

- Inline mark rendering `<mark>`; delimiters `==`, `mixable: true` — copy the
  Outline serializer shape since it targets prosemirror-markdown like us.
- Tokenizer: small inline rule in `markdown-syntax` (same skeleton as
  `wikiLinkTokenizer`); decline single `=` and unbalanced runs.
- Input rule for `==…==` while typing; selection-menu button alongside
  bold/italic.

### M4 — Math (inline `$x$`, block `$$…$$`)

- Two atom nodes with a `latex`/text content, per tiptap
  `extension-mathematics`; block math is its own node, not a code-block
  hijack (Milkdown's hijack couples two unrelated features).
- Tokenizer: strict inline `$…$` rule (decline `$ 5 and $6`-style false
  positives: no leading/trailing space inside delimiters, no digits abutting
  outside — follow Pandoc's rules) and block `$$` fence rule.
- Render with KaTeX behind a lazy dynamic import, mirroring the
  `code-highlight-shiki` lazy-parser pattern already in `core/editor`.
- Serialization must preserve interior newlines in block math (fixes the
  probe's `$$ x^2 $$` collapse).

### M5 — Reference links (decision milestone)

Options, in increasing cost:

- **A (document the normalization):** keep inlining, add a visible round-trip
  spec asserting it, note it in docs. Zero code.
- **B (preserve, GitLab pattern):** `isReference` + `canonicalSrc` attrs on
  the link mark, plus a `reference_definition` block node serialized
  verbatim. Requires a tokenizer change: markdown-it resolves references
  during parse, so the rule must capture the pre-resolution form.

Recommendation: A now (it is at least *visible* and meaning-preserving), B
only if real notes surface that rely on reference style. Entity decoding
(`&amp;` → `&`) is likewise accepted as documented normalization.

### M6 — Raw HTML strategy (design-first)

Keep `html: false` as the safety baseline — the probe confirms raw HTML
already round-trips as literal text, so nothing is lost today; it is only
unrendered. If/when rendering is wanted:

- Prefer Milkdown's model: a dedicated inline/block `html` node carrying the
  raw source in an attr, serialized verbatim, rendered as escaped literal
  with distinct styling ("this is raw HTML" chrome).
- GitLab's curated safe-subset marks (`kbd`, `abbr`, `ins`, …) can layer on
  top later for actual rendering of common inline tags; full arbitrary HTML
  rendering stays out of scope permanently (XSS surface, local-first app).

### M7 — Callouts `> [!note]`

Safe today (plain blockquote), so purely additive polish:

- GitLab's shape: extend blockquote with a `type` attr (+ optional title),
  parse `[!type]` from the blockquote's first paragraph at the tokenizer or
  parse layer, serialize back to `> [!type]`.
- Avoid Nextcloud's parse-only container approach — it cannot round-trip.

## Out of scope

- Definition lists and emoji shortcodes (niche; both currently normalize or
  pass through harmlessly — add visible normalization specs only).
- Footnote auto-renumbering.
- Full arbitrary raw-HTML rendering.
- Single-tilde `~strike~`: decide alongside M3 whether to accept-and-normalize
  to `~~strike~~` (one-line tokenizer option) or keep escaping; either way add
  a visible spec.

## Verification

Per milestone: `pnpm lint:ci`, `pnpm test:ci`, and `pnpm e2e:ci` (or a
filtered `pnpm exec playwright test <spec>` while iterating, with worktree
ports via `eval "$(node scripts/dev-ports.js --env)"`). Each feature ships
with tokenizer specs in `packages/js-lib/markdown-syntax/src/__tests__/`,
round-trip specs in `packages/core/editor/src/__tests__/`, and a Playwright
spec in `packages/tooling/e2e-tests/src/`.

## Next steps

1. M1 footnotes (fixes the only active corruption).
2. M2 autolinks.
3. M3 highlight, then M4 math.
4. M5/M6 decisions recorded here before any code.
