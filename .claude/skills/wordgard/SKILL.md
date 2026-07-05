---
name: wordgard
description: Write idiomatic Wordgard editor code (schema elements, extensions, commands, decorations, markdown specs) for the editor-w stack. Use whenever working on wordgard, @bangle.io/wordgard-utils, @bangle.io/wordgard-markdown, or packages/core/editor-w, or when reviewing such code.
---

# Wordgard

Wordgard (https://wordgard.net, by Marijn Haverbeke) is a semantic rich text
editor system — spiritually ProseMirror v2 with CodeMirror 6's extension
architecture. It was released in 2026-07 and is **not in model training
data**: never guess its API from ProseMirror or CodeMirror memory.

## Before writing any Wordgard code

1. Read `references/guide.md` (the system guide — the authoritative mental
   model).
2. Coming from a ProseMirror mindset, read
   `references/migrating-from-prosemirror.md`.
3. For exact signatures, read the installed typings:
   `node_modules/wordgard/dist/*.d.ts` (`doc`, `types`, `schema`, `table`,
   `state`, `editor`, `command`, `history`, `collab`, `phrases`). These have
   full doc comments and are the API reference. Grep them; do not invent
   methods.
4. `references/examples/*.md` show working end-to-end code (schema
   definition, transactions, dynamic config, styling, translations).

See `references/ATTRIBUTION.md` for provenance; refresh copies on version
bumps and read `references/CHANGELOG.md` when upgrading — Wordgard is 0.x
and breaks compatibility deliberately.

## Concept model (30 seconds)

- Document = immutable tree of **plots** (nodes with content) and **leaves**
  (no content; text is a leaf whose param is the string). A node's markup =
  its **tag**: `{type, param, marks}`. One param value replaces PM's attrs;
  optional/extra attributes are modeled as **marks** (e.g. image src is the
  leaf param, alt text is a mark).
- Nodes are value objects: no parent pointers, no identity, no mutation.
  Refer to positions by document offset; resolve with `doc.resolve(pos)`
  (`Pos`), map across changes with `ChangeSet.mapPos`.
- Changes are **ChangeSets** (delta over the old doc). Multiple changes in
  one spec are all addressed in *original* coordinates — no offset
  compensation. Insertions are token arrays (nodes, plot tags to open,
  `Plot.End` to close). Use `fit`/`{correct: ...}` when validity is unsure.
- Transactions are immutable, created from a **spec object**
  (`{changes, selection, userEvent, scrollIntoView, effects}`); metadata is
  **annotations**, state-directed payloads are **effects** (mappable).
  `wg.dispatch(spec)`; new state at `tr.state`.
- Configuration is a tree of **extensions** with precedence (`prec`).
  Extension points are **facets**; persistent extension state lives in
  **state fields** (reducer over transactions); DOM-integrated behavior is a
  **Wordgard.Plugin**; runtime feature toggling uses **compartments**.
- Schemas compose from reusable elements (`Plot.define`,
  `Plot.Type.define<P>`, `Leaf.Type.define<P>`, `Mark.define`,
  `Mark.Type.define<P>`, `Schema.Override`). Content rules are deliberately
  loose (allowed-set + may-be-empty); richer invariants belong in
  **corrections** (`Correction.onChildList/onContent/onMarks`), not the
  schema.
- **Commands** are `(editor, param?) => boolean | TransactionSpec`, and act
  as identities that extensions can override via `Command.handler` by
  precedence. Key bindings and input rules are extension values themselves.
- Rendering: DOM shapes via `Elt`; **decorations** are tag-level (all nodes
  of a type — this replaces NodeViews), point (widget/attributes/shape
  override/wrapper at a position), or range (attributes/wrapper over a
  span), sourced from facets, stored in `PointSet`/`RangeSet` and mapped in
  state fields. Styling via `Wordgard.styles`/`Wordgard.theme` (CSS-in-JS,
  `&dark`/`&light`).
- DOM updates flush on requestAnimationFrame. Dispatch **one coherent
  transaction**, not a loop of small ones. In plugins, use
  `scheduleDOMRead`/`scheduleDOMWrite`.

## Where does this behavior go?

| Need | Use |
| --- | --- |
| Expose a config/extension point | Facet |
| State that survives transactions | State field (+ effects to talk to it) |
| Enforce document invariants / repair | Correction |
| A user editing action | Command (spec-returning when possible) |
| Change behavior of an existing action | `Command.handler` with precedence |
| Custom node DOM / widgets | Shape + tag/point/range decorations (never NodeViews — they don't exist) |
| Overlay UI (tooltips, panels, menus) | Built-in Panel/Tooltip/Dialog/Menu facets first; custom `Wordgard.Plugin` second |
| Feature on/off at runtime | Compartment reconfigure |
| Turn user typing into structure | Input rules / key bindings in the extension bundle |

## Anti-patterns (PM habits to drop)

- Multiple attrs on a node → one param + marks.
- Content expressions / strict schema constraints → loose schema +
  corrections.
- `tr.setMeta` / plugin keys → annotations, effects, facets, fields.
- String node-type names in APIs → pass the type/tag objects.
- Node identity via object reference or stored `{from,to}` → offsets mapped
  through ChangeSets.
- Imperative DOM tweaks inside the editor → decorations or shapes, always.

## Rules in this repo

- Import Wordgard **only** through `@bangle.io/wordgard-utils` re-exports
  (the version-churn chokepoint). App code never imports `wordgard/*`
  directly.
- A feature ships as one extension bundle: schema element(s) + commands +
  key bindings + input rules + menu items + styles, **plus** its
  `MarkdownSpec` in `@bangle.io/wordgard-markdown` and golden-corpus
  fixtures proving markdown round-trip (repo invariant: markdown fidelity).
- `@bangle.io/wordgard-markdown` must stay editor-free (headless parse/
  serialize); `@bangle.io/wordgard-utils` must stay bangle-free.
- editor-w may never write a note that fails the parse→serialize round-trip
  gate. Never "normalize" user markdown as a side effect of loading.
- User-visible strings go through the `t` translations bridge to
  `PhraseSet`s; don't hardcode UI text.
- See `plans/011-wordgard-editor-w-migration.md` for the architecture,
  package boundaries, and current milestone.
