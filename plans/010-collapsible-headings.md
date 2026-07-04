---
title: Collapsible Headings (fold / unfold sections)
status: completed
type: plan
archived: false
archived_on:
created: 2026-07-03
updated: 2026-07-03
owner: agent
related_prs: []
related_issues: []
---

# Collapsible Headings

## Summary

Bring back the ability to collapse and uncollapse a heading — clicking a caret
next to a heading hides every block beneath it up to the next heading of the
same or higher level, and clicking again restores it. This existed in the
pre-rewrite app and was dropped during the rewrite. This plan is a guide for a
future implementer: it frames the real decisions, points at the references
worth studying, and flags the one trap that can corrupt user notes. It does not
prescribe code.

The product target is deliberately narrow: fold/unfold sections of a single
Markdown note for readability. It is **not** toggle/"details" blocks, not
arbitrary collapsible containers, not an outline panel. Folding is a *view*
affordance over ordinary Markdown headings; the stored note must stay ordinary
Markdown.

## Current status

Implemented with **Option B** (view-only folding; see the decision section
below for why). Shipped on this branch:

- `packages/js-lib/banger-editor/src/collapsible-heading.ts` — a new
  `setupCollapsibleHeading` collection: fold-range computation
  (`getHeadingFoldRange`), plugin state holding folded heading positions
  (mapped through transactions), node decorations that conceal folded blocks
  (`display: none` via class, nodeViews stay mounted), a widget-decoration
  chevron button per foldable heading, commands
  (`toggleHeadingCollapse`, `toggleHeadingCollapseAtPos`,
  `uncollapseAllHeadings`), queries, and an optional `keyToggleCollapse`
  keybinding config.
- Safety behavior: an `appendTransaction` guard pushes a cursor out of hidden
  regions on selection-only moves, and **auto-unfolds** a section when a doc
  edit lands inside it (e.g. Enter at the end of a folded heading) so typing
  can never become invisible. Deleting a folded heading reveals its content.
- The legacy `collapseContent` scaffold (attribute, `data-bangle-attrs`
  DOM blob, dormant `HeadingConfig.keyToggleCollapse`) was **removed** from
  `heading.ts` — it was a latent data-loss path.
- The toggle renders through a small reusable primitive,
  `createTrailingWidget` in
  `packages/js-lib/banger-editor/src/trailing-slot.ts`: an inline widget slot
  at the end of a block's text (`# heading ›`). It flows with the inline
  content, so on a wrapped heading it trails the last line, and it leaves the
  left gutter entirely to the block drag handle (an earlier gutter-stacked
  design broke drag-node targeting). Future features can attach their own
  trailing affordances to any block through the same helper; multiple slots
  render side by side.
- App wiring: `collapsibleHeading` extension in
  `packages/core/editor/src/extensions.ts` (labels via translations), slot and
  toggle styles in `typography.css`, omni-search commands
  `command::ui:toggle-heading-collapse` and
  `command::ui:uncollapse-all-headings` with handlers calling
  `PmEditorService.toggleHeadingCollapse()` / `.uncollapseAllHeadings()`.
- Fold state is intentionally per-session (resets on reload); nothing is ever
  written to the `.md`. Persisting fold state outside the note remains
  possible future work.
- Per-level commands: `command::ui:collapse-all-headings-1/2/3` fold every
  heading of that level without recursively folding deeper headings (a
  heading already hidden inside a folded section is skipped). Nested fold
  state composes: folding an outer section preserves inner folds, so
  unfolding restores the previous view.
- Dragging a folded heading (via the block drag handle) moves the entire
  hidden section with it and re-folds at the destination, preserving nested
  fold state — the plugin intercepts `handleDrop` and rebuilds the move,
  since the default drop would relocate only the heading node.

Verification: unit specs in
`packages/js-lib/banger-editor/src/__tests__/collapsible-heading.spec.ts`
(fold ranges, toggle/unfold-all, selection guard, auto-unfold, doc
invariance), Markdown round-trip specs in
`packages/core/editor/src/__tests__/collapsible-heading-markdown.spec.ts`
(byte-for-byte serialization with sections folded), and Playwright E2E in
`packages/tooling/e2e-tests/src/collapsible-headings.e2e.ts` (fold/expand via
the gutter toggle, reload data-safety, cursor-stranding). `pnpm lint:ci`,
`pnpm test:ci`, `pnpm e2e:ci`, and `pnpm build` pass; a manual
playwright-cli smoke pass covered hover affordance, level scoping,
omni-search commands, reload persistence, and console cleanliness.

## The one decision that matters: where does "hidden" live?

There are two families of implementation, and they differ in exactly one way —
whether the collapsed state is part of the document or not. Everything else
(carets, animation, keymaps) is downstream of this choice. Teach yourself the
tradeoff before touching code.

**Option A — content lives in a node attribute (the legacy / scaffolded path).**
The legacy mechanism moved the hidden sibling blocks *out of the document* and
stored them, serialized, inside the heading's `collapseContent` attribute; the
current schema is the residue of that. This makes collapse durable across
reloads for free and needs no side channel. Its fatal risk is Markdown
fidelity: the hidden blocks are no longer normal document nodes, so a naive
serializer drops them — which is precisely the state the code is in now. Under
this option, **saving a note with a collapsed heading silently deletes the
folded content from the `.md` file.** That directly violates Core Priority 1
(protect user data) and 2 (Markdown fidelity). If you keep this path you must
prove — with round-trip tests — that folded content survives
serialize→parse→reload byte-for-byte, and decide what a *non-Bangle* Markdown
tool (or a git diff) sees when it opens that file. There likely is no honest
Markdown representation of "content hidden inside a heading attribute," which is
the strongest argument against Option A.

**Option B — content stays in the document; only the *view* hides it.**
The blocks remain ordinary siblings in the doc and in the Markdown. Folding is a
transient decoration/plugin state that hides them visually (CSS `hidden` /
class), keyed by heading identity. Markdown output is untouched, so fidelity is
free and there is nothing to migrate. The cost: fold state is view-state, so if
you want it to survive reload you persist a small map **outside the note**
(local view-state / IndexedDB keyed by workspace path + heading), never in the
`.md`. This keeps the note as the single source of truth and treats folding as
what it actually is — a reading preference.

Recommendation to weigh, not obey: Option B fits this app's priorities better
(durable Markdown, view concerns out of content). If you choose it, the existing
`collapseContent` attribute and its `toDOM`/`parseDOM`/`data-bangle-attrs`
handling should probably be **removed**, not extended — leaving it in place is a
latent data-loss bug even if the toggle is never shipped. Confirm that judgement
against the legacy behaviour before deleting.

## Where to draw inspiration

Three editors were surveyed for this feature. The blunt finding: **none of them
implement true heading-based folding.** That is itself the lesson — this is a
slightly unusual feature, and the legacy Bangle implementation is the closest
prior art that exists. Study these for the *sub-problems*, not for a drop-in
design.

- **Legacy Bangle (this repo's own history) — the primary reference.** The last
  commit that shipped the working feature is `d97008e7` ("fix core palettetest
  (#447)", 2023-09-24), immediately before the rewrite commit `6cc66f40`
  ("setup things") deleted it. Read:
  - `lib/editor-plugins/collapsible-heading-deco.ts` — the ~160-line decoration
    plugin that rendered clickable SVG chevrons and, on click, called
    `heading.toggleHeadingCollapse()`. Note it also coupled to an
    intersection-observer plugin to avoid decorating off-screen headings — a
    perf tactic worth understanding before copying, since the rewrite's editor
    may not carry that infrastructure.
  - `extensions/core-editor/index.ts` — the command wiring
    (`operation::@bangle.io/core-editor:collapse-heading` and
    `:uncollapse-all-heading`), which is the shape the new command layer
    (`packages/shared/commands` + `packages/core/command-handlers`) should
    mirror.
  - The actual fold logic (`toggleHeadingCollapse`, `listCollapsedHeading`,
    `uncollapseAllHeadings`) lived in `@bangle.dev/base-components`, not in the
    repo. This is where the `collapseContent`-attribute mechanism came from —
    trace it there before assuming how it behaved, especially around Markdown.

- **TipTap's `Details` extension (`@tiptap/extension-details`) — best source for
  the hard edge cases**, even though it is a *container* toggle block, not
  heading folding. Two ideas transfer regardless of which option you pick:
  1. **A `persist` flag that switches the same feature between "view-only"
     (state not in the doc) and "durable" (state as a node attribute).** This is
     exactly the Option A/B axis above, made concrete — a clean way to reason
     about it even if you don't expose the flag.
  2. **The bookkeeping folding forces on you:** a selection-correction plugin
     (via `appendTransaction`) that pushes the cursor *out* of hidden content
     when arrow keys or a click would strand it inside a collapsed region, and a
     reusable `isNodeVisible` helper (`offsetParent !== null`) instead of ad-hoc
     visibility checks. ProseMirror does not natively know that in-document
     content is visually hidden; whichever option you choose, you inherit this
     problem and TipTap has already solved it well. It also hides via a `hidden`
     attribute + CSS rather than `display:none`/node removal, keeping the
     nodeView stable.

- **ProseKit — no fold feature, but two small transferable habits.** Debounced
  hover-state diffing so the caret doesn't flicker as the pointer crosses gaps
  between blocks, and gating expand/collapse animation on
  `prefers-reduced-motion`. Its block-handle also demonstrates anchoring an
  affordance as a floating overlay tracked to a DOM rect instead of a widget
  decoration — an option if chevron re-render cost becomes a problem, at the
  price of manual rect tracking on scroll/resize.

- A fourth reference examined (a reverse-engineered capture of a proprietary
  Markdown editor) had **no** collapsible-heading feature; its heading node is
  stock. Nothing to borrow for this specifically. (Describe it generically in
  any durable artifact; do not name it.)

Takeaway from the survey: the mainstream pattern in other editors is a *toggle
container node*, which restructures the document and changes the serialized
output. That is the wrong shape for a Markdown-durable note app. Heading-level
folding as a pure view concern (Option B) is the less-travelled but better-fit
path here.

## Rough shape of the work (not prescriptive)

Enough detail to plan, not enough to skip thinking:

1. Decide Option A vs B and reconcile the existing `collapseContent` scaffold
   accordingly (extend it, or remove it — do not ignore it).
2. Fold engine in `packages/js-lib/banger-editor` next to `heading.ts`,
   composed the way `table/` and other features are (schema/plugin/command/query
   split). It needs: "given a heading, find its folded range up to the next
   same-or-higher heading," a toggle, an "uncollapse all," and a query for
   current state. The range computation is the core logic and deserves the most
   unit tests.
3. The caret affordance — reuse the existing decoration/`hover.ts`/
   `selection-menu` patterns already in `banger-editor` rather than inventing a
   new overlay system.
4. Commands + keybinding surfaced through `packages/shared/commands` and
   `packages/core/command-handlers`, mirroring the legacy operation IDs, and
   honouring the dormant `keyToggleCollapse` config.
5. Selection/keyboard correctness around hidden regions (the TipTap lesson).
6. Persistence, only if desired, via view-state outside the note (Option B) —
   never by writing fold state into the `.md`.

## Out of scope

- Toggle/"details" blocks or any new collapsible container node.
- Folding lists, code blocks, or arbitrary blocks — headings only.
- An outline / table-of-contents panel.
- Persisting fold state inside the Markdown file under any option.

## Verification

Per the root `AGENTS.md`, a released feature needs committed Playwright
coverage, and data-path changes need failure/round-trip coverage. At minimum:

- **Markdown round-trip unit tests (non-negotiable):** a note with one or more
  collapsed headings must serialize→parse→reload with the folded content intact,
  byte-for-byte. This is the test that catches the current scaffold's data-loss
  behaviour; write it first and watch it fail before fixing.
- Unit tests for the fold-range computation: nested levels, a heading with no
  following content, trailing content after the last heading, adjacent headings,
  and folding while the cursor sits inside the region.
- A Playwright E2E proving the user-visible workflow: create a Browser
  workspace + note, fold a heading, assert the content is hidden, **reload**,
  and assert both the fold behaviour and — critically — that no content was
  lost. Cover the persistence path you chose.
- Keyboard/selection behaviour: cursor cannot get stranded inside a collapsed
  region via arrow keys or click.

## Known blockers / risks

- **Data loss via serialization (highest risk).** The current
  `collapseContent` path drops folded content from Markdown. Any Option-A design
  must close this before shipping; the round-trip test above is the gate.
- **Missing perf infrastructure.** The legacy plugin leaned on an
  intersection-observer plugin the rewritten editor may not have. Confirm what
  exists before porting the decoration wholesale.
- **Legacy behaviour is partly in `@bangle.dev/base-components`, not this repo.**
  Reconstructing exact semantics means reading that dependency, not just
  `d97008e7`.

## Next steps

1. Read `d97008e7:lib/editor-plugins/collapsible-heading-deco.ts` and
   `d97008e7:extensions/core-editor/index.ts`, and trace
   `toggleHeadingCollapse`/`listCollapsedHeading` into
   `@bangle.dev/base-components` to pin down the legacy mechanism.
2. Write the failing Markdown round-trip test against the current scaffold to
   make the data-loss concrete.
3. Choose Option A vs B (recommend B) and reconcile the `collapseContent`
   scaffold before building anything new.
