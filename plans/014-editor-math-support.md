---
title: ProseMirror editor math support
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-12
updated: 2026-07-12
owner: mixed
related_prs: []
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/197
---

# ProseMirror editor math support

## Summary

Add editable inline and display math to the current ProseMirror editor by
integrating [`@benrbray/prosemirror-math`](https://github.com/benrbray/prosemirror-math)
with KaTeX. Store math as portable Markdown rather than renderer-specific HTML:
`$...$` inline and a `$$` fenced block for display math.

This plan is the focused implementation plan for the math milestone in
`plans/012-markdown-feature-parity.md`. It deliberately covers only the current
ProseMirror editor and its existing Markdown pipeline.

## Decisions

### Source format

Math is a Markdown extension, not CommonMark. Use the syntax shared by major
Markdown note editors and renderers:

```md
Euler's identity is $e^{i\pi} + 1 = 0$.

$$
\begin{aligned}
a^2 + b^2 &= c^2 \\
x &= \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{aligned}
$$
```

- Inline source is `$...$`.
- Display source is canonically serialized with opening and closing `$$` on
  separate lines. The parser may accept a single-line `$$...$$` display block,
  but saving normalizes it to the multiline form above.
- Interior TeX source, including backslashes and newlines, is preserved. The
  editor must never replace invalid or unsupported TeX with rendered output,
  an empty node, or normalized fallback content.
- Do not introduce renderer-specific HTML, JSON attributes, `\(...\)` /
  `\[...]`, or fenced code blocks labelled `math` in the first release. They
  can be considered later as additional input aliases, but the
  dollar-delimited form is the broadest note-app interchange format.

The interoperability choice is grounded in current public documentation:
[Joplin](https://joplinapp.org/help/apps/markdown/#math-notation),
[Zettlr](https://docs.zettlr.com/en/scientific-technical/math/), and
[Typora](https://support.typora.io/Math/) all document `$...$` inline and
`$$...$$` display math. GitHub Markdown also accepts those delimiters even
though it uses a different renderer. The canonical multiline display form is
the conservative subset shared by the note-taking applications.

### Conservative delimiter rules

Follow Pandoc-style inline delimiter rules, which are also used by established
Markdown editors to avoid currency false positives:

- the opening `$` is unescaped, is not part of `$$`, and is not followed by
  whitespace;
- the closing `$` is unescaped, is not preceded by whitespace, and is not
  immediately followed by a digit;
- inline math cannot cross a newline and empty `$ $` / `$$` spans stay text;
- escaped dollars, code spans, fenced code, and ambiguous/unclosed delimiters
  stay ordinary Markdown text;
- `$5 and $6`, `$ x $`, and an unmatched `$x` must not become math.

Display math is recognized only as a complete block fence. An unclosed `$$`
must decline parsing instead of consuming the rest of the note. Support the
same block form inside blockquotes and list items when the surrounding schema
allows a block node.

### Renderer and editing model

- Use `@benrbray/prosemirror-math` 1.x as the interaction library and KaTeX
  0.16.x, the range accepted by its peer dependency. Do not fork or paste the
  library implementation into the repository.
- Reuse the library's `math_inline` and `math_display` node shape (`text*`
  content), nested source editor, cursor navigation, Backspace behavior, and
  plain-text clipboard support.
- Keep the stored value as text content rather than a rendered HTML attribute.
  Rendering errors are visible in the editor while the exact source remains
  editable and serializable.
- Keep KaTeX's accessible HTML+MathML output and safe default `trust: false`.
  Verify a finite `maxSize` and `maxExpand` configuration before release. If
  the upstream plugin does not expose the required limits, add the smallest
  local plugin adapter around its exported `MathView`; do not modify vendored
  files.
- The package imports KaTeX eagerly. Record the before/after production bundle
  sizes rather than claiming lazy loading. Optimize loading only if the build
  measurement justifies a separate adapter or chunking change.

## Implementation

### 1. Engine-neutral Markdown syntax

Add an opt-in math tokenizer to `@bangle.io/markdown-syntax`, following the
existing frontmatter/table tokenizer pattern:

- an inline rule that emits `math_inline` with untouched TeX content;
- a block rule that emits `math_display`, preserves interior newlines, accepts
  canonical multiline and full single-line display forms, and declines an
  unclosed fence;
- focused tokenizer tests for accept, decline, escape, currency, whitespace,
  code, nesting, single-line normalization, multiline preservation, and CRLF.

Keep the tokenizer opt-in through the editor collection so enabling it cannot
change unrelated Markdown consumers.

### 2. Reusable ProseMirror collection

Add `setupMath()` in `@bangle.io/banger-editor` and re-export it through
`@bangle.io/prosemirror-plugins`.

The collection owns:

- the library-compatible `math_inline` and `math_display` node specs;
- the upstream math plugin and its NodeViews;
- strict inline and block input rules using node types from the active schema;
- `mathBackspaceCmd` in the existing ordered keymap system;
- typed insert-inline and insert-display commands;
- Markdown token mappings and serializers;
- a clipboard text serializer that emits `$...$` / `$$...$$` without
  regressing ordinary plain-text copy behavior.

Do not install the library's permissive default inline regular expression
unchanged. The typing rule and Markdown parser must agree on delimiter
boundaries. Do not bind `Mod-Space` by default because it conflicts with common
OS/input-method shortcuts.

Declare runtime dependencies in every package that directly imports them.
`banger-editor` owns the ProseMirror integration; the browser editor owns KaTeX
and math-view CSS imports. Use the repository dependency maintenance script and
validate that the universal `banger-editor` entry remains safe to import in
Node-based tests.

### 3. Browser editor wiring and UI

- Register `setupMath()` in `packages/core/editor/src/extensions.ts`.
- Import KaTeX's font/style sheet from the browser editor and add small
  theme-aware math source, focus, selection, invalid-expression, inline, and
  display styles in `packages/core/editor/src/typography.css`.
- Ensure the existing direct `image` NodeView and plugin-provided math NodeViews
  coexist; add a regression test around the merged NodeView resolution if the
  wiring changes.
- Add a translated “Math block” slash-menu item that inserts and focuses an
  empty display node. Inline math is primarily created by typing `$...$`; its
  typed insert command remains available for future toolbar/command use.
- Retain the library's direct-edit model: selecting/clicking rendered math
  exposes its TeX source, `Ctrl-Enter` exits display editing, arrow navigation
  crosses node boundaries, and Backspace enters/deletes predictably.

### 4. Fidelity and interaction coverage

Add exact parse/serialize tests through the production `markdownLoader` for:

- inline and display math next to bold, italic, links, code, and dollar text;
- multiline environments, `\\`, braces, underscores, pipes, ampersands,
  escaped dollars, Unicode, leading/trailing blank lines, and CRLF input;
- display math in blockquotes and list items;
- invalid and unsupported KaTeX that still serializes byte-for-byte internally;
- unclosed/ambiguous delimiters that remain text;
- parse -> serialize -> parse structural stability;
- copying inline/display selections to plain text with delimiters.

Add collection-level tests for commands, input rules, cursor entry/exit,
Backspace, empty-node deletion, invalid render state, and two simultaneously
mounted editors so plugin state/macros cannot leak between notes.

Add a committed Playwright E2E workflow that:

1. creates a Browser workspace and note;
2. types inline math and creates a display block through user-visible controls;
3. edits both sources and verifies rendered output;
4. enters invalid TeX and verifies the source remains visible/editable;
5. reloads and verifies both expressions and the invalid source persist;
6. copies an expression and verifies delimiter-bearing plain text where browser
   clipboard permissions are available.

## Verification

During implementation:

- run focused Vitest files for the tokenizer, collection, and production
  round-trip tests;
- run a filtered Playwright test with worktree ports from
  `eval "$(node scripts/dev-ports.js --env)"`;
- run `pnpm build` and compare generated asset sizes because KaTeX, fonts, CSS,
  and a new dependency affect production bundling.

Before PR/release:

- `pnpm lint:ci`
- `pnpm test:ci`
- `pnpm local-ci-check`
- `playwright-cli` manual smoke against the release candidate: inline entry,
  display entry/edit/exit, invalid expression recovery, copy, reload, and the
  standard Browser-workspace persistence path.

## Out of scope

- MathJax as a second renderer or runtime renderer selection.
- Automatic equation numbering, labels/cross-references, chemistry extensions,
  custom macro settings, and a symbol palette.
- Converting arbitrary pasted HTML/MathML or screenshots into TeX.
- Supporting every TeX command accepted by other renderers. The Markdown source
  remains portable, but visual support in the first release is KaTeX's supported
  subset.
- Alternate Markdown delimiters or fenced code blocks labelled `math`.

## Known risks

- KaTeX and MathJax accept different TeX subsets. Preserve source and show a
  non-destructive error state so moving a note through Bangle never destroys a
  command that another app understands.
- The library's NodeView contains a nested ProseMirror editor. Composition,
  mobile selection, clipboard, multiple editor instances, and teardown need
  explicit tests rather than assumptions from the demo.
- The library's plugin and node names are fixed. Keep those names at the
  collection boundary and avoid a parallel local schema.
- Math delimiters overlap with currency. Parser and input-rule behavior must be
  driven by the same tested boundary policy.

## Next steps

1. Add the dependencies and tokenizer with the decline/round-trip matrix.
2. Build `setupMath()` around the upstream package and prove interaction in
   collection tests.
3. Wire browser styles and slash-menu insertion.
4. Add the user-visible Playwright persistence workflow.
5. Run the full gates, production bundle comparison, and manual release-candidate
   smoke before marking the feature ready.
