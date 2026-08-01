---
title: Wordgard migration (editor-w) — second editor engine behind an engine-agnostic seam
status: active
type: plan
archived: false
archived_on:
created: 2026-07-05
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/609
  - https://github.com/bangle-io/bangle-io/pull/613
  - https://github.com/bangle-io/bangle-io/pull/616
  - https://github.com/bangle-io/bangle-io/pull/620
  - https://github.com/bangle-io/bangle-io/pull/623
  - https://github.com/bangle-io/bangle-io/pull/630
  - https://github.com/bangle-io/bangle-io/pull/655
  - https://github.com/bangle-io/bangle-io/pull/658
related_issues: []
---

# Wordgard Migration (`editor-w`)

## Summary

Introduce [Wordgard](https://wordgard.net) (Marijn Haverbeke's new semantic
rich text editor system, spiritually ProseMirror v2 with CodeMirror 6's
extension architecture) as a second editor engine in Bangle.io, named
**editor-w**. The two engines live side by side behind an engine-agnostic
service contract, switchable at runtime via an omni-search command. Parity is
built iteratively — every increment merges to `main` behind the switch — and
the default flips only when editor-w earns it. ProseMirror/banger-editor stays
fully working and default throughout.

This is a **code-side migration only**. Bangle.io's durable format is
Markdown; there are no stored ProseMirror documents to convert. That removes
the entire "document corpus migration" problem that generic
ProseMirror→Wordgard advice centers on. What we must build instead is the
missing Markdown bridge (Wordgard has HTML in/out but no Markdown story) and
a Wordgard-native re-implementation of our editor features.

Key upstream facts (as of 2026-07-05):

- `wordgard@0.1.1` on npm, first numbered release 2026-07-02. Single package,
  subpath modules: `wordgard/{doc,types,schema,table,state,editor,command,history,collab,phrases}`.
- Pre-1.0 for "one or two years" per the FAQ; breaking changes expected.
- Upstream accepts **no PRs**. Custom functionality must live in our own
  modules — which is exactly the package structure below.
- We have reserved the `wordgard-utils` npm name.
- Docs are vendored in this repo at `.claude/skills/wordgard/references/`
  (guide, ProseMirror-migration doc, FAQ, examples, changelog), backing the
  `wordgard` skill that teaches agents to write idiomatic Wordgard code.

## Current status

All groundwork PRs are merged (2026-08-01 summary):

- **M0 seam** (PR #609): `EditorEngineContract` / `editorEngine` slot,
  `data-editor-engine` on the mount, the single documented `EditorSurface`
  app-layer leak point.
- **markdown-syntax extraction** (PR #613): `@bangle.io/markdown-syntax`
  owns the engine-neutral markdown-it base tokenizer + wiki-link syntax;
  the PM loader and the backlink extractor consume it, with no editor
  dependency.
- **M1 codec + packages + golden corpus** (PR #616, hardened in
  #655/#658): `@bangle.io/wordgard-utils` (single wordgard chokepoint +
  custom schema elements) and `@bangle.io/wordgard-markdown` (headless
  codec) pass the shared golden corpus in `@bangle.io/test-utils`
  byte-identically on both engines. The mark-spec registration order in
  `defaultMarkdownSpecs` is load-bearing (outermost first, `Code` last).
  Tables stay PM-only (`engines: ['prosemirror']` fixtures) until the M3
  Wordgard table specs.
- **M0b engine switch + read-only stub** (PR #620): `@bangle.io/editor-w`
  renders raw markdown read-only; URL selection, composition-root wiring,
  `command::ui:switch-editor-engine`, and e2e switch coverage landed.
- **M4-P0 wordgard-plus bridge** (PR #623): `createEditorAtoms`,
  `createMenuAtoms`/`useResolvedMenu`, and the `<TooltipHost>` portal
  glue, verified live via a Storybook toolbar demo.

M2 (writable Wordgard editor + `editor-common` extraction + live
round-trip gate) has not started; editor-w is still the read-only stub.

Math (plan 012 M4, PR #637) is PM-only: wordgard-markdown has no math
`MarkdownSpec` and the golden corpus has zero math fixtures — not even as
`engines: ['prosemirror']`. A math row is added to the feature parity
matrix below so the parity worklist stays honest.

- **Coordination rule with plan 012 (markdown feature parity):** every
  012 construct changes what a note's bytes mean, so each 012 milestone
  must either land the Wordgard `MarkdownSpec` + BOTH_ENGINES corpus
  fixtures in the same stream, or explicitly add its fixtures as
  `engines: ['prosemirror']` so the parity worklist stays visible. Two
  012 items are load-bearing here: enabling `linkify` in the BASE
  tokenizer (012-M2) changes the shared token stream and would make the
  Wordgard parser throw on every bare URL unless its handler ships
  simultaneously; and 012-M5/M6 normalization decisions (reference
  links, entities) are already pinned as cross-engine `canonical` corpus
  fixtures — changing them means updating the corpus contract, not just
  PM specs.

## Guiding principles

1. **Markdown is the only durable format.** Engine choice must never change
   bytes on disk except through explicit user edits. No Wordgard JSON is ever
   persisted; there is no storage migration, ever.
2. **The contract is the editor.** Everything above the service seam —
   pages, commands, save protection, navigation — interacts with a typed
   editor contract and must not know which engine powers it. The contract is
   markdown-in / markdown-out, so it must fit *any* editing surface, not only
   WYSIWYG: a future raw/source editor (see "Designing for a raw source
   editor") is just another implementation of the same seam, and that litmus
   test keeps WYSIWYG-only assumptions out of the shared contract and kernel.
3. **Embrace Wordgard's design.** Facets, state fields, corrections, command
   handlers, tag/point/range decorations, `Elt` shapes, compartments. Do not
   port ProseMirror idioms (NodeViews, appendTransaction patterns, schema
   content expressions) one-to-one. When a feature's PM implementation fights
   Wordgard's grain, redesign it.
4. **Trunk-based, continuously merged.** No long-lived branch. Every
   milestone is a series of small PRs that pass full CI and merge behind the
   engine switch. editor-w may be half-featured on `main` for months; that is
   the intended state.
5. **Fork first, share when stable.** editor-w starts as a fork of
   `core/editor`. Engine-agnostic pieces (save queue, load-status machine,
   editor React shell) get extracted into a shared package *when the fork
   demonstrates they are identical*, not speculatively up front.
6. **Data-safety gates over vibes.** editor-w may not write a file unless it
   has proven, for that exact file, that parse→serialize is lossless (see
   round-trip gate).

## Architecture

### Two parallel stacks, one seam

The current stack and the target stack, mapped onto workspace layers:

```
                    ProseMirror stack (today)          Wordgard stack (new)
                    ─────────────────────────          ────────────────────────
core (app)          core/app pages — engine-agnostic, unchanged
seam                EditorEngineContract (core/context) — one slot, one contract
core (service)      core/editor                        core/editor-w
                    (PmEditorService)                  (EditorWService)
core (shared)              core/editor-common (extracted at M2):
                           save queue · load-status · <Editor> shell
js-lib              js-lib/prosemirror-plugins         js-lib/wordgard-utils
                                                       js-lib/wordgard-markdown
external            banger-editor + prosemirror-*      wordgard (pinned exact)
```

The seam already 90% exists: `PmEditorServiceContract` in
`packages/core/context/src/service-types.ts:18` is markdown-centric
(`mountEditor`, `getSelectionMarkdown`, `insertMarkdownAtSelection`, save
status, heading collapse) and leaks no ProseMirror types. Consumers outside
`core/editor` (command handlers, `app/save-protection.tsx`,
`app/app-error-handler.tsx`, `initialize-services`) already go through it.
The migration formalizes that seam rather than inventing one.

### New packages

**1. `@bangle.io/wordgard-utils`** (`packages/js-lib/wordgard-utils`,
bangle-agnostic, the `banger-editor` analog)

- The **single import chokepoint** for `wordgard/*`. Nothing else in the repo
  imports `wordgard` directly (mirrors how `banger-editor/pm` re-exports all
  `prosemirror-*`). This makes the 0.x upgrade churn a one-package problem
  and gives us a place to patch over upstream breaking changes.
- Our reusable, app-agnostic Wordgard extensions, written Wordgard-style:
  each feature is one extension bundle combining schema elements, key
  bindings, input rules, commands, corrections, menu items, and styles.
  Initial roster (built across milestones): task lists, wiki-link node +
  syntax, placeholder, trailing block, active-node highlight, collapsible
  headings, shiki code-highlight bridge. Strictly **headless** — anything
  that renders React or positions floating DOM lives in `wordgard-plus`
  (see "Floating UI" and the wordgard-plus section); the trigger/suggestion
  machinery is split accordingly (minimal trigger core here or in
  wordgard-plus behind a thin seam, UI in wordgard-plus — pending upstream
  autocompletion, issue #13).
- Carries zero Bangle imports. Long term this is publishable as
  `wordgard-utils` (name reserved); publishing itself is out of scope here.

**2. `@bangle.io/wordgard-markdown`** (`packages/js-lib/wordgard-markdown`,
bangle-agnostic — the missing `prosemirror-markdown` equivalent)

- A pure, editor-free codec: `markdown string ⇄ Wordgard Plot.Doc`.
  Parser: markdown-it token stream → Wordgard tokens/nodes. Serializer: node
  walk → markdown writer (fenced code, list indentation, escaping — the same
  hard-won rules `pm-markdown` encodes today).
- Extensible the Wordgard way, not the string-name way: a `MarkdownSpec`
  entry is keyed by the node/mark **type object** (`Heading`, `Link`,
  `TaskItem`…) and declares `parse` (token → tag/leaf/plot-open) and
  `serialize` (node → writer calls). A codec is assembled from a list of
  specs; `wordgard-utils` extension bundles export their spec alongside
  their schema element so schema and markdown support travel together.
- Must work **without an editor or GardState** — the save path, the backlink
  indexer, and future workers serialize/parse headlessly. (Optionally also
  expose a facet so a codec can be derived from an editor config; that is a
  convenience, not the foundation.)
- **Shared syntax layer:** the markdown-it configuration (GFM strikethrough,
  task lists, tables, wiki-link `[[…]]` syntax plugin) must be *identical*
  between engines, or the two editors would disagree about what a note
  means. Extract the tokenizer setup into a small engine-neutral module —
  either inside `wordgard-markdown` with the PM loader consuming it, or as
  `@bangle.io/markdown-syntax` if extraction from `pm-markdown`'s tokenizer
  proves clean. This also fixes an existing altitude problem:
  `service-core/backlink-markdown-extractor.ts` imports
  `@bangle.io/prosemirror-plugins` only for the tokenizer + wiki-link syntax;
  after extraction it depends on the markdown layer and no editor engine at
  all. Keep this proportional — do the extraction as part of M1, not as a
  speculative framework before it.

**3. `@bangle.io/editor-w`** (`packages/core/editor-w`)

- `EditorWService`: a fork of `core/editor`'s `PmEditorService` implementing
  the same contract with the same `static deps` (`fileSystem`, `navigation`,
  `workbenchState`, `workspaceState`) and the same save-queue semantics.
- Its React surface (slash menu, link menu, table menu, selection menu, date
  picker) is **rebuilt on Wordgard primitives**, not ported — composed from
  `@bangle.io/wordgard-plus` components (which own the tooltip-portal, menu
  resolution, and Jotai bridge; see the wordgard-plus section) plus
  editor-w-local wiring for app concerns (wiki-link target resolution,
  commands, workspace state). `@floating-ui/dom` and the hand-rolled
  plugin→jotai plumbing do not carry over.
- Bridges Bangle's `t` translations into Wordgard `PhraseSet`s so built-in UI
  (menus, dialogs, table controls) is localized consistently.

**4. `@bangle.io/wordgard-plus`** (`packages/js-lib/wordgard-plus`,
bangle-agnostic — opinionated plug-and-play Wordgard surfaces)

- The shadcn-posture component layer: React chrome (selection toolbar,
  link popover, suggest listbox, dialog helpers) + the Jotai/tooltip/menu
  bridge, complementing a consumer's own Wordgard setup — never wrapping
  or owning the editor instance. Full philosophy, invariants, module
  roster, and upstream-coordination policy in the "Floating UI" and
  "`@bangle.io/wordgard-plus`" sections (after the feature parity
  matrix).
- First consumer is editor-w; carries zero Bangle imports so later
  extraction is mechanical (an explicit non-goal for now).

**5. `@bangle.io/editor-common`** (`packages/core/editor-common`, extracted
at M2 — not before)

- The engine-agnostic editor kernel, pulled out of `core/editor` once
  editor-w proves the code is shared verbatim: `EditorSaveQueue`
  (write-coalescing, retry, ordering — this is user-data-critical code and
  must exist exactly once), the load-status state machine, the `<Editor>`
  React shell that calls `mountEditor`, and save-status subscription glue.
- `core/editor` and `core/editor-w` both depend on it; neither depends on
  the other.
- Keep it **surface-category-agnostic**: the kernel may know only
  `EditorEngineContract`, never a rich document model. Validate the extraction
  against the future raw/source editor — a CodeMirror surface must be able to
  ride this same save queue, load-status machine, and `<Editor>` shell (see
  "Designing for a raw source editor"). Anything that cannot belongs in an
  engine, not the kernel.

### The seam, precisely

- Rename `PmEditorServiceContract` → **`EditorEngineContract`** and the
  `pmEditorService` slot → **`editorEngine`**. ("editorService" is taken by
  service-core's small reload-signal service; "engine" also says the right
  thing: this slot is *whatever powers the editing surface*.) This is a
  mechanical, behavior-free rename PR done first (M0), while there is still
  only one implementation.
- Audit the contract for engine leaks as editor-w grows. Anything editor-w
  cannot reasonably implement is a contract smell to fix at the contract
  level. Internal-only APIs (e.g. `getEditor(name)` returning `EditorView`)
  stay off the contract, as they already are.
- Contract semantics that must hold for any engine (document these on the
  type): mount is idempotent per `name` and returns a cleanup; saves are
  coalesced so an older completion can never clobber a newer edit; a failed
  load never writes anything; `hasPendingOrFailedSave` is the source of
  truth for dirty-state UI and save protection.

### Designing for a raw (source) editor (and other future surfaces)

Litmus rule for the Wordgard milestones: never bake WYSIWYG-only
assumptions into `EditorEngineContract` or `editor-common` — each time the
contract or kernel grows, ask whether a CodeMirror source surface could
implement it sensibly. The source editor's product design and delivery
(per-note rich ⇄ raw toggle, gate fallback, CodeMirror loading) now live
in `plans/013-live-markdown-source-editor.md`; this rule is all that
remains in scope here.

### Engine selection and switching

**Selection happens at the composition root, before container instantiation**
(per the repo's DI invariant: configure services before the container is
built):

1. The current URL selects `?editorEngine=prosemirror|wordgard`; missing or
   unknown values default to ProseMirror. The hash router preserves this query
   parameter during app navigation.
2. `initialize-services` reads the flag and `createServiceSetup` directly
   registers **one** implementation under the `editorEngine` slot. Both engine
   packages are statically imported, but only one service is live in a tab.
**Switching is a reload, not a hot swap.** The omni-search command
(`command::ui:switch-editor-engine`, `omniSearch: true`) opens the standard
single-select dialog — "ProseMirror (stable)" / "Wordgard (experimental)" —
then:

1. Refuses (with a toast pointing at the failed save) if
   `hasPendingOrFailedSave()` reports failed writes; otherwise awaits the
   save queue draining.
2. Updates `editorEngine` in the current tab's query string.
3. Reloads the current page. Other tabs keep running with their own URL and
   current editor.

Reload-based switching is deliberate: it matches the DI model, avoids
double-mounted editors and stale plugin state, reuses existing reload +
save-protection infrastructure, and keeps the switch **boring** — which is
what a data-carrying switch should be. Additive futures this must not preclude:
per-note or side-by-side comparison, and — the concrete near-term one — a
per-note rich ⇄ raw (source) toggle that can swap in place without a reload
(see "Designing for a raw source editor"). Keep the engine enum and this
command shaped so a third value or a mode toggle is additive, not a redesign.

**Observability:** the editor root element carries
`data-editor-engine="prosemirror" | "wordgard"`, both engines get a shared
stable test hook (so e2e helpers stop keying on `.ProseMirror`), and
editor-w shows a small persistent "experimental editor" badge with a
one-click way back.

### Data-safety gates (non-negotiable)

- **Round-trip gate:** when editor-w opens a note, it parses the markdown and
  immediately serializes it back. If the result differs from the source
  (modulo a single trailing newline), the note opens **read-only** with a
  banner ("this note uses constructs the experimental editor can't yet
  preserve") and a one-click switch to the stable engine. A failed gate also
  logs *which construct* diverged, which doubles as the parity worklist.
  editor-w never writes to a file whose gate failed. The gate is a
  **rich-engine** concern only — raw/source editing has nothing to round-trip,
  which is why a future raw editor is the natural *editable* fallback for a
  failed gate (superseding read-only-only), and why the gate also certifies a
  rich ⇄ raw toggle as lossless.
- Parse failures, permission loss, quota errors, and aborts remain distinct
  failure paths exactly as in the PM service; a failed load never writes
  fallback content (existing invariant, restated because a new engine is
  where it would silently regress).
- The save queue's ordering/coalescing semantics are reused, not
  re-implemented (hence `editor-common`).

## Feature parity matrix

From the current extension inventory (`core/editor/src/extensions.ts`).
"Built-in" means Wordgard ships it; "build" means it goes in
`wordgard-utils` (agnostic) or `editor-w` (bangle-specific).

| Feature (PM stack today) | Wordgard path | Milestone |
| --- | --- | --- |
| doc/paragraph/text, heading, blockquote, hr, hard break | Built-in (`wordgard/types`, `wordgard/schema`) | M2 |
| bold, italic, strike, inline code, underline | Built-in marks | M2 |
| bullet/ordered lists | Built-in list extensions; build indent/dedent commands (M2-L1/M2-L2, see Lists section) | M2 |
| code block + language | Built-in (`CodeBlock` + `CodeBlockLanguage` mark) | M2 |
| YAML frontmatter | `Frontmatter` plot + codec spec landed (M1 hardening); editing chrome/corrections with M2 | done (codec) |
| undo/redo history | Built-in (`wordgard/history`) | M2 |
| link mark + link menu | Built-in link mark; popover is wordgard-plus `link-popover` (M4-P2) | M3–M4 |
| image node, local-image node view, resize | Built-in image/figure/`imageResizing`; asset resolution is ours | M5 |
| tables + table menu | Built-in `wordgard/table` (cell selection, commands, rectangularity corrections) + our markdown | M3 |
| task lists (flat-list `kind: task`, checked; toggle/collapsed dropped) | `TaskItem` plot landed in M1; commands/input rule/checkbox are M3-T1..T3 (see Lists section) | M3 |
| wiki link node + `[[` suggestions | Build in wordgard-utils (syntax + node) / editor-w (target resolution) | M3 |
| markdown parse/serialize (pm-markdown) | **Build: `wordgard-markdown`** — the critical path | M1 |
| math (inline `$x$` / block `$$…$$`; PM side landed via plan 012 M4, PR #637) | Build: math `MarkdownSpec` in `wordgard-markdown` + corpus fixtures | M3 or M5 |
| slash commands, date picker suggestions | wordgard-plus `suggest` UI over a thin trigger seam (upstream #13); consumers in editor-w (M4-P3) | M4 |
| selection menu (floating toolbar) | wordgard-plus `selection-toolbar`: Tooltip facet + resolved 1p menu items in React (M4-P1) | M4 |
| placeholder, trailing node | Build (small decorations/corrections) | M4 |
| drag handle, drop gap cursor | Build (UI in wordgard-plus); Wordgard owns selection/cursor drawing — verify native DnD behavior first (M4-P4) | M4 |
| active-node highlight | Build (decorations + state field) | M4 |
| collapsible headings | Build (state field + point/range decorations); collapse state stays out of the document | M5 |
| code syntax highlight (shiki) | Build (range decorations from a state field) | M5 |
| asset file paste/drop → asset storage, asset links | Build in editor-w (input handling + leaf shapes) | M5 |
| heading navigation (scroll-to-heading on route) | editor-w service, same contract behavior | M3 |
| save queue, save status, retry | Shared via editor-common | M2 |

Design deltas to embrace rather than emulate (see the `wordgard` skill for
the full treatment): attributes become *param + marks* (heading level is a
number param; image src is the leaf param, alt is a mark); content
expressions become *corrections*; NodeViews become *tag/point decorations
with `Elt` shapes*; plugin props become *facets*; transaction meta becomes
*annotations/effects*; feature flags inside the editor become
*compartments*; DOM work batches on RAF, so bulk operations dispatch one
coherent transaction.

### Lists: Wordgard's built-in nested model, NOT a flat-list port

The PM engine uses `prosemirror-flat-list` (one flat `list` node with a
`kind` attr) because PM's own nested `ul > li` stack made list manipulation
genuinely painful — strict content expressions, lift/sink commands that
drag unselected content along, and position surgery for every structural
edit. Those are PM pains, and Wordgard was designed around them: loose
content queries + corrections, multi-change specs addressed in original
coordinates, and first-party `toggleList`/`splitTextblock`/`joinListItems`
commands over the nested `BulletList`/`OrderedList`/`ListItem` model.

Decision: editor-w stays on the built-in nested model. Porting a flat-list
design would orphan us from Wordgard's 1p commands, menu buttons, input
rules, and future upstream fixes — recreating on the Wordgard side the 3p
coupling we're trying to leave behind on the PM side. The nested model is
also what the markdown codec is built on: markdown-it's token nesting maps
onto it 1:1 (the flat model is precisely why the PM engine needs the
list_item-only parse with `ignore`d wrapper tokens and the
`flatListToMarkdown` reconstruction). Flat-list features we consciously do
NOT carry: toggle lists (never had markdown serialization; effectively
unused) and arbitrary same-line indentation (unrepresentable in markdown —
supporting it would fight the fidelity invariant). Documents are stored as
markdown, so no `migrateDocJSON`-style model migration exists between the
engines.

Known 1p gaps, all extension-level work (not model work), broken into
sub-milestones below. Everything lands as one extension bundle per the
`wordgard` skill (schema element + commands + keybindings + input rules +
menu items + styles + MarkdownSpec + corpus fixtures), with the reusable
parts in `@bangle.io/wordgard-utils` and app wiring in editor-w.

**M2-L1 — list keymap baseline (1p commands only).** Wire what Wordgard
already ships: `bulletList()`/`orderedList()` bundles (schema, `- `/`1. `
input rules, menu buttons), `toggleList` on Mod-Shift-8/9 (PM key parity),
`splitTextblock` on Enter (splits the item), `joinListItems`/`joinBackward`
on Backspace at item start, `listIsActive` for menu state. No custom code
beyond keybinding glue. Exit: create/edit/split/join bullet and ordered
lists; every doc a command produces serializes to corpus-stable markdown.

**M2-L2 — indent/dedent commands (the real gap; build in wordgard-utils).**
Wordgard core ships no list indent/dedent. Build `indentListItem` /
`dedentListItem` as spec-returning commands over the nested model, using
`wrapBlockRange`/`unwrapBlock`/`findWrappable` and multi-change specs in
original coordinates (no offset surgery). Behavior bar is flat-list's
"accurate range" semantics — only the selected items move:

- *Indent:* the selected item(s) move into a nested list (same kind as the
  enclosing list) appended to the previous sibling item's content. No
  previous sibling → no-op. Tab keybinding, list-scoped.
- *Dedent:* the selected item(s) move out to the parent list after their
  containing item; unselected trailing siblings of the dedented item become
  a nested list inside it (they must not travel up — that is the exact
  flat-list improvement over `liftListItem`). At top level, dedent unwraps
  the item into its blocks. Shift-Tab keybinding.
- Nested-list kind is preserved on both moves (an ordered sub-list stays
  ordered when its parent chain changes).

Tests: unit specs asserting the exact output document per selection shape
(single item, range spanning siblings, range spanning nesting levels,
first/last item, item with trailing siblings), plus a markdown round-trip
assertion on every produced doc. Exit: Tab/Shift-Tab muscle-memory parity
with the PM engine for bullet/ordered lists.

**M3-T1 — task commands.** `toggleTaskList` (rewrites the selected items'
tags between `ListItem` and `TaskItem.of(false)`; wraps unlisted blocks in
a bullet list of task items first, mirroring PM's toggle) on Mod-Shift-7,
and `toggleTaskChecked` (flips the containing `TaskItem`'s boolean param)
on Mod-Enter. Both spec-returning, both keyed by tag objects, both unit
tested with round-trip assertions.

**M3-T2 — task input rule.** Typing `[ ] ` or `[x] ` at the start of a
textblock converts it to an (un)checked task item — inside a list it
retags the item; outside it wraps in a bullet list first (parity with PM's
`wrappingListInputRule(/^\s*(\[([ |x])\])\s$/)`). Ships in the same
extension bundle as M3-T1.

**M3-T3 — checkbox rendering + click.** `TaskItem`'s shape already renders
`li[data-task-checked]`; add the interactive checkbox as a tag decoration
(never a NodeView — they don't exist) whose click dispatches one coherent
transaction flipping that item's param by document offset, without moving
the selection or requiring focus. Styling via `Wordgard.styles` with
`&dark`/`&light`. E2E covers click-to-check on a real note (checked state
must survive reload — it is document content).

**Deliberately not built:** toggle/collapsible lists (no markdown
serialization exists in the PM engine either; the input rule there is
commented out — carrying them would add an unserializable construct) and a
correction evicting `TaskItem` from `OrderedList` (the shape only arises
from parsing `1. [ ] x`, and the serializer already normalizes it to
`- [ ] x`; add a correction only if editing commands prove able to create
the shape unintentionally).

**Round-trip gate interaction (decide in M2):** the corpus now
distinguishes byte-stable fixtures from `canonical` normalization fixtures
(`1. [ ] x` → `- [ ] x`, `*em*` → `_em_`, ...). A byte-strict gate opens
every normalizing note read-only, even though the PM engine silently
rewrites the same notes on save today. Default to strict (read-only is the
conservative, data-safe choice); if dogfooding shows it fires often,
extend the gate with a second class — "output differs from source, but the
output is itself a fixed point AND the PM engine produces identical bytes"
— which may open editable behind an explicit "this note will be
normalized on first save" notice. Never silently widen the gate.

### Floating UI: Wordgard positions, React renders, Jotai holds UI state

Today's PM chrome hand-rolls the hard part: `core/editor` positions React
menus with `@floating-ui/dom`, and `banger-editor` smuggles a Jotai store
through a PM plugin (`store/store.ts`) to expose plugin state to React.
Wordgard makes that middle layer first-party, and we should stop owning
it. Division of labor for every floating surface in editor-w:

- **Wordgard owns geometry and lifecycle.** `Tooltip.show` (a facet) and
  `Tooltip.hover` anchor DOM to *document positions* — mapped through
  changes, flipped/clipped/overlap-managed, repositioned on RAF, with
  `Tooltip.View`'s `connect`/`disconnect`/`positioned` hooks. `Panel` owns
  docked top/bottom chrome; `Dialog.show` gives promise-based form prompts
  on top of panels. `@floating-ui/dom` does not come along to editor-w:
  anything anchored to editor content rides the Tooltip facet.
- **React owns content.** A tooltip/panel's `dom` is a plain element; we
  portal React into it (`createPortal` into `View.dom`, mounted on
  `connect`, released on `disconnect`). Wordgard never knows React exists.
- **Jotai owns UI state.** Chrome state (which surface is open, active
  item, query text) lives in per-editor Jotai atoms — the repo's one state
  mechanism — fed by a single `updateListener`-driven bridge (below). The
  document and selection are never mirrored into atoms; atoms hold derived
  read models and UI-local state only, and the write path is always
  "React → dispatch a command/transaction", never atom→editor sync.
- **The menu MODEL stays first-party even where the menu UI is ours.**
  Wordgard menu items (`Menu.Button.define`, submenus, groups, ranks,
  `select`/`enable`/`active` predicates) are extension values that feature
  bundles already declare — `bulletList.toggleButton` et al. — and the
  guide explicitly blesses custom renderers: resolve the `Menu.Item.source`
  facet with `Menu.resolve` and display the result "maybe as a React
  component". So our toolbars consume resolved 1p menu items rendered with
  our components; we never fork a parallel menu-item registry. The stock
  `menuBar` remains available for barebones/dev setups.

### `@bangle.io/wordgard-plus` — components that complement, never wrap

A new package of opinionated, plug-and-play Wordgard surfaces — the
shadcn posture, not the tiptap posture. Tiptap wraps the engine: it owns
the editor instance, re-exports the API, and you live inside its
abstraction. wordgard-plus does the opposite and holds these invariants:

- **Never owns the editor.** No `<WordgardPlusEditor>`, no config factory,
  no lifecycle management. Every deliverable is (a) an extension bundle
  you add to *your* Wordgard config, or (b) a React component you render
  in *your* tree, connected to an existing `Wordgard` instance you pass
  in. Deleting wordgard-plus from an app must leave a working editor.
- **Never re-exports Wordgard.** Consumers import wordgard themselves;
  wordgard-plus types accept wordgard values at the boundary.
- **Opinionated by Bangle's priorities** (markdown-serializable behavior,
  local-first, keyboard-first, a11y non-negotiable — icon buttons carry
  `description` for screen readers per the Wordgard menu guide). It is
  fine for v0 to say "this is how Bangle does it".
- **Bangle-free.** First consumer is editor-w, but the package carries
  zero `@bangle.io` app imports so extraction later is mechanical.
  User-visible strings arrive via props/PhraseSets, never the global `t`.

**Placement and boundaries.** `packages/js-lib/wordgard-plus`, following
the `banger-editor` precedent (js-lib already hosts React+Jotai editor
chrome). It depends on `@bangle.io/wordgard-utils` (the wordgard import
chokepoint, which grows `editor`/`command`/`menu`/`view` re-exports in
M2/M4), `jotai`, and `react` — and NOT on `packages/ui/*` (js-lib cannot;
this is also what keeps it extractable). Components ship working default
markup styled with theme-variable-driven CSS (dark/light via Wordgard's
`&dark`/`&light` for editor-internal styles) plus `className`/slot
overrides; editor-w composes them with our base-ui look. The dividing
line against its sibling: **wordgard-utils = headless** (schema elements,
commands, corrections, input rules, markdown specs — e.g. the TaskItem
checkbox decoration from M3-T3), **wordgard-plus = chrome** (anything
that renders React or positions floating DOM). In-repo module first;
extraction is a later, separate decision.

**v0 module roster (bangle-priority order):**

1. `bridge` — the foundation everything else uses:
   - `createEditorAtoms(wg)`: one `updateListener` subscription feeding a
     per-editor Jotai store scope; exposes read atoms (selection summary,
     active marks/blocks via `listIsActive`-style predicates, canUndo/
     canRedo, focus state) with equality guards so a keystroke doesn't
     re-render every consumer. Per-editor scoping is mandatory — split
     view / side-by-side must never share chrome state.
   - `useResolvedMenu(wg, template?)`: resolves `Menu.Item.source` items
     through `Menu.resolve` into plain data (label/icon/run/active/
     enabled/description), re-evaluated per the items' `updateFor`
     predicates, exposed as an atom.
   - `reactTooltip(...)` / `<TooltipHost>`: the portal glue that lets a
     `Tooltip.View` render a React subtree (mount on `connect`, unmount
     on `disconnect`).
2. `selection-toolbar` — floating toolbar over non-empty selections
   (extension: state field + `Tooltip.show` value; component: toolbar
   rendering the resolved inline menu group). Parity target:
   `core/editor`'s `inline-selection-menu`.
3. `link-popover` — hover + cursor-in-link popover (`Tooltip.hover`
   source + edit form component). Parity target: `link-menu`.
4. `suggest` — trigger-based autocomplete UI (`[[`, `/`, `$date`):
   listbox component + keyboard navigation over a minimal trigger-state
   extension. **Upstream-sensitive — see coordination note below**: the
   trigger-detection/matching core is deliberately a thin, replaceable
   seam because upstream is considering 1p autocompletion.
5. `dialogs` — thin styled helpers over 1p `Dialog.show` for
   editor-scoped prompts. App-level dialogs stay in Bangle's dialog
   service; the boundary is "does it prompt about editor content at the
   cursor, or about the workspace".
6. Later candidates as their milestones arrive: table menu (M3), drag
   handle (M4), code-block language picker (M5 — upstream-sensitive,
   #11).

**Upstream coordination — build, wait, or thin-seam.** Marijn's tracker
(`code.haverbeke.berlin/wordgard/wordgard/issues`) already lists several
of these as candidate first-party features. Policy: where upstream has
*stated intent*, we either wait or build behind a deliberately thin seam
we can re-base; we never build a rival core.

- **#13 autocompletion in core** — the big one; overlaps our `suggest`
  module. M3 needs wiki-link `[[` suggestions regardless, so build the
  *UI* (listbox, keyboard model, Jotai atoms) now, keep the
  trigger/matching core minimal and private, and re-base it on 1p
  autocomplete when it ships. Do not polish or generalize our core.
- **#11 CodeBlockLanguage UI** — defer ours (language picker is M5
  anyway); adopt or restyle upstream's.
- **#14 menu bar top container** — watch; affects `Panel` placement
  options wordgard-plus relies on.
- **#12 collaborative editing** — out of scope for this migration either
  way; note only that wordgard-plus components must not assume
  single-client state shapes that would fight `wordgard/collab` later.
- **#10/#9 (CodeMirror-in-code-block, footnote examples)** — upstream
  examples to crib from when M5 reaches code blocks; not blockers.
- **#8 iOS autocorrect / #4 Android voice-typing cursor bugs** — not
  wordgard-plus items, but they gate the M6 flip: add "mobile IME
  behavior acceptable on real devices" to the M6 exit checklist and
  track both issues there. Do not flip defaults while either reproduces
  on a supported device.

## Milestones

Each milestone is a stream of small PRs, merged continuously, full CI green.
Milestones can overlap where dependencies allow; the ordering below is the
dependency spine, not a calendar.

**M0 — Seam hardening (no Wordgard code) — DONE**
DONE — see Current status.

**M0b — Switch plumbing (lands with the editor-w stub) — DONE**
DONE — see Current status.

**M1 — `wordgard-markdown` + shared syntax + golden corpus**
DONE except the Wordgard table specs (scheduled M3) — see Current status.
This milestone was the schwerpunkt; nothing writable ships before it. Exit
(met for the non-table schema): corpus green on both engines headlessly.

**M2 — Writable core editing**
Wordgard editor wired in editor-w: schema assembly from wordgard-utils
bundles, history, keymaps, input rules, styles/theme (dark/light via
Wordgard's `&dark`/`&light`), `t`→PhraseSet bridge; save pipeline through
the extracted `editor-common` save queue; round-trip gate live (including
the strict-vs-normalizing policy decision — see "Round-trip gate
interaction" under the Lists section). List editing lands as sub-milestones
M2-L1 (1p keymap baseline) and M2-L2 (indent/dedent commands — the one
real 1p gap), specified in the Lists section. Exit: you can live in
editor-w for plain notes (paragraphs/headings/lists/marks/code) with
durable, gate-protected saves and Tab/Shift-Tab list parity; persistence
smoke (create → edit → reload → verify) passes on editor-w.

**M3 — Bangle constructs**
Task lists (sub-milestones M3-T1 commands, M3-T2 input rule, M3-T3
checkbox rendering + click — specified in the Lists section), wiki links +
`[[` suggestions, tables + markdown, heading navigation. Exit: a typical
existing Bangle note passes the round-trip gate and is fully editable,
including checking a task with the mouse.

**M4 — Interaction chrome (built as `wordgard-plus`)**
The floating/menu surfaces land as wordgard-plus modules composed by
editor-w (see the "Floating UI" and wordgard-plus architecture sections):

- *M4-P0 — package scaffold + bridge — DONE:* `createEditorAtoms` (one
  editor plugin → per-editor Jotai atoms with equality guards),
  `createMenuAtoms`/`useResolvedMenu` (`Menu.resolve` over the
  `Menu.Item.source` facet), and the `<TooltipHost>` React-portal glue
  for `Tooltip.View`s. Exit (met): a story/demo page shows a toolbar of
  resolved 1p menu items rendered in React, updating live, on a plain
  Wordgard setup with zero Bangle imports (see "M4-P0 complete" above,
  including the config-time-extension API adaptation).
- *M4-P1 — selection toolbar* (parity: `inline-selection-menu`): state
  field + `Tooltip.show` extension, React toolbar over the resolved
  inline menu group. Keyboard accessible; e2e-covered.
- *M4-P2 — link popover* (parity: `link-menu`): `Tooltip.hover` source +
  cursor-in-link tracking, edit form, open/copy/remove actions.
- *M4-P3 — suggest UI + consumers:* generic listbox/keyboard model in
  wordgard-plus over a deliberately thin trigger core (upstream #13
  seam); slash menu and date picker in editor-w composed from it. (The
  wiki `[[` consumer lands earlier, in M3, on the same seam — build the
  seam with M3, polish the generic UI here.)
- *M4-P4 — remaining chrome:* placeholder, trailing block, active-node
  highlight (headless → wordgard-utils); drag handle (UI portion in
  wordgard-plus; verify against Wordgard's native DnD/selection drawing
  first).

Exit: muscle-memory parity — a PM user switching engines loses no
workflow — and `@floating-ui/dom` is absent from the editor-w dependency
graph.

**M5 — Assets and long-tail**
Image/asset paste-drop, asset links, shiki highlighting, collapsible
headings, image resize UX; perf pass (large-doc typing latency, decoration
recompute, load time) against the PM baseline on the same corpus.

**M6 — Confidence and flip**
Full e2e suite runs against both engines (engine-parameterized fixture);
maintainer dogfoods editor-w as personal default; **mobile IME check**:
upstream wordgard issues #8 (iOS autocorrect removes words) and #4
(Android voice-typing cursor mismatch) must be fixed or verified
non-reproducing on real devices before any default flips. Then flip
stages: default for new users → default for all (PM reachable via the
same switch command) → finally, as a **separate decision**, retire the PM
stack (delete `core/editor`, `prosemirror-plugins`, banger dependency)
once editor-w has soaked. The switch machinery itself is cheap and can
outlive the flip as a safety valve.

## Testing strategy

- **Golden corpus is the parity contract** (M1). Every new wordgard-utils
  extension lands with corpus fixtures covering its constructs, per the
  repo's markdown-fidelity invariant. Any gate failure seen in the wild
  becomes a corpus fixture first, then a fix.
- Unit (vitest): wordgard-markdown and wordgard-utils logic tests are
  headless (doc/state modules don't need a browser). Editor-behavior tests
  that need real DOM use Playwright component tests, as today.
- E2E: helpers gain an engine parameter (set the URL via the switch
  command in a fixture, assert on `data-editor-engine`). The full suite
  stays PM-default; an editor-w smoke set grows per milestone and runs in
  `pnpm e2e:ci`. At M6 the full suite runs on both.
- Failure paths per repo rules: every data-path change covers failure and
  abort behavior; round-trip-gate behavior (mismatch → read-only, no write)
  gets explicit e2e coverage.

## The `wordgard` skill

The skill lives at `.claude/skills/wordgard/` (SKILL.md + vendored upstream
docs). Refresh the vendored docs on every `wordgard` version bump.

## Risks

- **Wordgard is 0.x and days old.** Breaking changes are promised; selection
  /IME/mobile robustness is unproven at scale. Mitigations: exact-pin the
  version; single import chokepoint; PM stays default until M6; round-trip
  gate bounds the blast radius to "experimental editor annoyed me", never
  data loss.
- **No upstream PRs.** Anything we need that upstream lacks is ours to build
  and maintain in wordgard-utils (upstream explicitly endorses third-party
  modules). Budget for that; report genuine bugs via the upstream forum.
- **Markdown serialization fidelity is the hard 20%.** That is why M1
  precedes any writable editor, why the tokenizer is shared, and why the
  gate exists at all.
- **Two engines on main for months** — bundle and maintenance overhead. Both
  engines ship for now to keep composition straightforward; the parity matrix
  keeps the tail visible instead of open-ended, and feature work during the
  transition may need dual implementation (accepted cost, weighed per feature).
- **Fork drift** between editor-w and core/editor before M2 extraction.
  Mitigation: extract `editor-common` as soon as the save queue is needed
  (M2), keep the fork window short.

## Out of scope

- Collaborative editing (`wordgard/collab` exists; nothing here precludes
  it, nothing here builds it).
- Any storage/format change, ever.
- Publishing `wordgard-utils` to npm (name reserved; publishing comes after
  the flip, if at all).
- Mobile/desktop shells, PM removal mechanics (M6 flags the decision point
  only).
- The raw/source (CodeMirror) editor itself. This plan only keeps the seam and
  `editor-common` kernel able to admit it (see "Designing for a raw source
  editor"); building the surface, its toggle, and syntax highlighting is a
  separate future plan.

## Verification

For this plan PR (docs-only): documented paths verified —
`packages/core/context/src/service-types.ts` (contract),
`packages/core/initialize-services/src/service-setup.ts` (slot wiring),
`packages/core/editor/src/extensions.ts` (feature inventory),
`packages/js-lib/prosemirror-plugins/src/markdown-loader.ts` +
`packages/core/service-core/src/backlink-markdown-extractor.ts` (markdown
path), vendored docs against wordgard.net sources. Code milestones carry the
standard bar: `pnpm lint:ci`, `pnpm test:ci`, relevant Playwright suites,
and committed e2e coverage for every released behavior.

## Known blockers

None. M0 can start immediately.

## Next steps

1. M2: wire a real Wordgard editor into editor-w (schema assembly from
   wordgard-utils bundles, history, keymaps, styles, `t`→PhraseSet bridge),
   extract `editor-common` (save queue, load-status, `<Editor>` shell) when
   editor-w first needs it, and bring the round-trip gate live (including
   the strict-vs-normalizing policy decision).
2. Table parity (M3): add Wordgard table specs over the shared
   `tableTokenizer` and flip the corpus table fixtures to both engines.
