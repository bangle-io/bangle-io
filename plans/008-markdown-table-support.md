---
title: Markdown Table Support
status: active
type: plan
archived: false
created: 2026-07-01
updated: 2026-07-01
owner: mixed
related_prs: []
related_issues: []
---

# Markdown Table Support

## Summary

Add table editing to Bangle.io in a way that feels simple and direct for note
taking, while staying honest to the app's priorities: durable Markdown,
ProseMirror-first editing, local-first safety, and maintainable package
boundaries.

The target is "Notion-like" in the narrow product sense:

- a table can be created from the editor without typing Markdown by hand;
- rows and columns can be added or removed from visible controls;
- keyboard navigation through cells is predictable;
- the stored note remains Markdown pipe-table text;
- reload, cross-session persistence, and existing Markdown files keep working.

This is not a plan for Notion databases, formulas, filtering, views, arbitrary
cell widgets, or spreadsheet behavior. Tables should feel like a natural block
inside a Markdown note, not a second product embedded in the editor.

## Current Status

V1 is implemented on branch `worktree-markdown-table-support` (2026-07-01):

- `packages/js-lib/banger-editor/src/table.ts` owns the schema
  (`prosemirror-tables` `tableNodes`, inline-only cells, `align` cell attr),
  `tableEditing()`/`fixTables` plugins, commands (insert, add/delete
  row/column, delete table, cell navigation, column alignment), keyboard
  behavior (Tab/Shift-Tab, Enter, and full arrow-key navigation: cell-to-cell
  moves, edge hops that wrap rows, entering a table from adjacent textblocks,
  and exiting into an adjacent or newly inserted paragraph — native caret
  motion cannot cross the isolating cell boundaries), the markdown-it `table`
  tokenizer plugin, parse specs, and the pipe-table serializer. Gap cursors
  are disabled inside rows because inline-content cells are textblocks, which
  made between-cell positions valid gap-cursor spots.
- `packages/js-lib/banger-editor/src/table-menu/` exposes a `$tableMenu` atom
  (selection-menu pattern) that tracks the active table for the React UI.
- `packages/core/editor` registers `setupTable()`/`setupTableMenu()`, adds the
  slash-command "Table" entry, renders the floating "Table options" dropdown
  (`components/table-menu.tsx`), and styles tables in `typography.css`.
- Round-trip coverage lives in
  `packages/core/editor/src/__tests__/table-markdown.spec.ts`; command and
  keyboard coverage in
  `packages/js-lib/banger-editor/src/__tests__/table.spec.ts`; released-flow
  E2E coverage in `packages/tooling/e2e-tests/src/tables.e2e.ts`.
- In-cell line breaks: Enter/Shift-Enter insert a hard break, persisted as
  `<br>` (the GFM convention). The tokenizer converts `<br>` back to hard
  breaks only inside table cells; `<br>` text outside tables keeps
  round-tripping as literal text. Mod-Enter exits below the table.
- The cell containing the cursor gets a `prosemirror-active-table-cell`
  outline decoration; a cell selection covering the whole table deletes the
  table on Backspace/Delete.
- Deliberate v1 constraints: "add row above" is disabled on the header row,
  and a table whose header row was deleted serializes with its first body
  row promoted to the header on the next parse.

Original pre-implementation notes:

- `packages/core/editor/src/extensions.ts` composes the editor extensions and
  currently registers no table extension.
- `packages/core/editor/src/pm-setup.ts` serializes the entire ProseMirror doc
  through `markdown.serializer.serialize(view.state.doc)` on document changes.
  Table support therefore must be part of the normal Markdown parser and
  serializer path, not an export-only feature.
- `packages/js-lib/banger-editor/src/common/collection.ts` already has a
  `markdown` extension slot with `nodes`, `marks`, and `tokenizerPlugins`.
  Prefer that extension mechanism over app-level parser mutation.
- `packages/js-lib/prosemirror-plugins/src/markdown-loader.ts` creates
  `markdown-it('commonmark', { html: false, breaks: false })`, enables
  `strikethrough`, installs the list plugin, and then applies each extension's
  `markdown.tokenizerPlugins`.
- `packages/core/editor/src/index.tsx` already mounts editor-adjacent React UI
  such as slash command, wiki link menu, link menu, and inline selection menu.
  A table handle UI should follow this pattern.
- `packages/js-lib/banger-editor/src/drag/index.ts` already has table-ish
  assumptions in `defaultIsTableRow`. Revisit this when adding actual table
  node names so row and cell structure does not accidentally get generic drag
  affordances.
- Existing Markdown round-trip tests live mostly around the core editor setup.
  Use them as examples, but keep table rules as low in the dependency graph as
  practical.

## Guiding Principles

### Preserve Markdown First

Tables are stored as Markdown pipe tables. If a representation cannot be stored
in pipe-table Markdown without data loss, do not expose it as a released v1
editing feature.

This principle rules out first-version UI for:

- merged cells;
- row spans;
- persistent column widths;
- arbitrary block content inside cells;
- nested lists or multi-paragraph cells;
- HTML table import/export as an editable table model.

It does not forbid internal ProseMirror attrs that `prosemirror-tables` needs
for correct operation. It means the UI should not invite users to create state
that Bangle cannot faithfully serialize and parse back.

### Stay ProseMirror-First

Use the ProseMirror table model and commands as the editing core. Avoid a
hand-rolled table editor made of generic nodes, custom DOM poking, or React
state pretending to be document state.

The likely dependency is `prosemirror-tables`. As of 2026-07-01, local package
inspection showed the latest published version as `1.8.5`; re-check before
installing because package state can change.

### Keep V1 Small Enough To Finish

A good first release is:

- parse existing Markdown pipe tables;
- serialize edited tables back to pipe-table Markdown;
- insert a default table;
- add and delete rows and columns;
- navigate with Tab and Shift-Tab;
- expose simple row and column handles;
- preserve links, emphasis, code, and escaped pipes inside cells.

That is already enough surface area to require careful schema, parser,
serializer, command, UI, and persistence tests. More expressive table features
can land after the base format proves stable.

### Teach The Codebase, Do Not Fight It

The generic table extension belongs in `packages/js-lib/banger-editor`. The
Bangle-specific command registration, slash command entry, and React table UI
belong in `packages/core/editor`. User-visible strings belong in
`packages/shared/translations/src/languages/en.ts` through the global `t`
pattern, even though some existing editor UI still has older raw strings.

Do not widen workspace dependency rules to make imports pass. Move behavior to
the lowest valid package instead.

## Reference Projects

Use these projects to understand tradeoffs. Do not copy any of them blindly.

### Existing Bangle Code

Inspect these files before implementation:

- `packages/core/editor/src/extensions.ts`
- `packages/core/editor/src/pm-setup.ts`
- `packages/core/editor/src/index.tsx`
- `packages/core/editor/src/components/slash-command.tsx`
- `packages/js-lib/banger-editor/src/common/collection.ts`
- `packages/js-lib/prosemirror-plugins/src/markdown-loader.ts`
- `packages/js-lib/banger-editor/src/link-menu/index.ts`
- `packages/js-lib/banger-editor/src/selection-menu/index.ts`
- `packages/js-lib/banger-editor/src/drag/index.ts`
- `packages/shared/translations/src/languages/en.ts`
- `packages/tooling/e2e-tests/src/common.ts`
- `packages/tooling/e2e-tests/src/slash-command.e2e.ts`

The most important local fact is that Markdown serialization is the save path.
Any table serializer bug can become a data-loss bug.

### Old Bangle Table Spike

Local reference:

- `/Users/kushanjoshi/code/bangle-io-tables-pr/packages/js-lib/banger-editor/src/table.ts`
- `/Users/kushanjoshi/code/bangle-io-tables-pr/packages/core/editor/src/__tests__/table-markdown.spec.ts`
- `/Users/kushanjoshi/code/bangle-io-tables-pr/packages/core/editor/src/pm-setup.ts`

What to learn:

- The spike chose `cellContent: 'inline*'`, which fits Markdown pipe-table
  cells and works naturally with `markdown-it` table tokens.
- Its tests around inline Markdown, escaped pipes, and code spans are useful
  examples for Bangle's desired fidelity.

What not to copy:

- The spike hand-rolls many table commands that `prosemirror-tables` already
  provides.
- It mutates the Markdown parser from `core/editor` to enable table tokens.
  The current collection API has `tokenizerPlugins`; use that instead.
- It is a useful proof of direction, not the maintainable architecture.

### Tiptap Table Extension

Local reference:

- `/Users/kushanjoshi/code/tiptap-reference/packages/extension-table`

Useful files:

- `src/table/table.ts`
- `src/cell/table-cell.ts`
- `src/header/table-header.ts`
- `src/row/table-row.ts`
- `src/table/utilities/markdown.ts`

What to learn:

- Tiptap wraps the `prosemirror-tables` command set: insert table, add/delete
  rows and columns, delete table, move through cells, and toggle headers.
- It installs `tableEditing()` and optionally `columnResizing()`.
- Its keyboard shortcuts show the expected Tab and Shift-Tab behavior.

What to treat carefully:

- Tiptap uses its own extension architecture and Markdown integration. Do not
  port those APIs directly.
- Its Markdown utility normalizes cell content in ways that may be too lossy
  for Bangle. Bangle should not silently collapse meaningful inline content
  just because another editor does.
- Tiptap's richer `block+` cell content is not automatically compatible with
  Bangle's current `markdown-it` parser path.

### ProseKit Table UI

Local reference:

- `/Users/kushanjoshi/code/pm-inspir/prosekit`

Useful files:

- `packages/extensions/src/table/table-spec.ts`
- `packages/extensions/src/table/table-plugins.ts`
- `packages/extensions/src/table/table-commands.ts`
- `packages/web/src/components/table-handle/utils.ts`
- `packages/web/src/components/table-handle/store.ts`
- `registry/src/react/ui/table-handle/table-handle.tsx`

What to learn:

- ProseKit is a strong reference for row and column handle UX.
- Its handle state separates ProseMirror table geometry from React rendering.
- It uses `domCellAround`, `posAtCoords`, `cellAround`, and `TableMap` to
  derive hovered row and column context.
- It freezes handle context while menus are open so the UI does not jump away
  during interaction.

What not to copy:

- Do not import ProseKit concepts as a framework layer. Bangle already has its
  own extension collection, service wiring, React composition, and UI patterns.
- Use the ideas, not the package architecture.

### Substack Reverse Engineering

Local reference:

- `/Users/kushanjoshi/code/substack-prosemirror-reveng`

What to learn:

- Substack is useful for thinking about static rendering versus interactive
  editing boundaries, schema assembly, and sanitization.
- It is not a useful source for Bangle's editable table implementation. Local
  inspection did not find a reusable `prosemirror-tables` editing path.

Do not use Substack as the table architecture driver.

## Recommended Architecture

### Package Shape

Add a generic table extension to `packages/js-lib/banger-editor`, probably as:

- `packages/js-lib/banger-editor/src/table.ts`

The extension should own:

- table node specs;
- ProseMirror plugins required for table editing;
- reusable commands and queries;
- keyboard shortcuts if that matches local extension conventions;
- Markdown parser token specs;
- Markdown serializer functions;
- any plugin state needed by a generic table handle UI.

Then integrate it from `packages/core/editor`:

- register `setupTable()` in `packages/core/editor/src/extensions.ts`;
- add slash command UI in `packages/core/editor/src/components/slash-command.tsx`;
- mount table handles from `packages/core/editor/src/index.tsx`;
- put user-visible strings in translations;
- add E2E tests in `packages/tooling/e2e-tests/src`.

If the handle state mirrors the existing link or selection menu pattern, keep
the ProseMirror plugin and atom map in `banger-editor`, and keep the React
component in `core/editor`.

### Dependency

Add `prosemirror-tables` as a runtime dependency of
`packages/js-lib/banger-editor`. It is generic ProseMirror behavior and should
not live only in `core/editor`.

Before adding it, confirm:

- current latest version;
- dependency compatibility with the repo's ProseMirror packages;
- whether the lockfile changes only as expected.

Prefer the repo's normal dependency workflow. If adding manually with pnpm,
review `packages/js-lib/banger-editor/package.json` and `pnpm-lock.yaml`
carefully.

### Schema

Use `tableNodes` from `prosemirror-tables` rather than hand-writing the full
table schema unless local constraints force otherwise.

Recommended v1 model:

```ts
tableNodes({
  tableGroup: 'block',
  cellContent: 'inline*',
  cellAttributes: {
    align: {
      default: null,
      getFromDOM: ...,
      setDOMAttr: ...,
    },
  },
})
```

The important choice is `cellContent: 'inline*'`.

Why inline cells are the right default for Bangle v1:

- Markdown pipe-table cells are inline Markdown containers.
- `markdown-it` emits inline tokens directly inside `th_open` and `td_open`
  for pipe tables.
- Bangle can support links, emphasis, strong, strike, inline code, hard
  escaping, and plain text without inventing paragraph wrappers.
- It avoids a parser transform whose only job is to synthesize paragraph nodes
  inside cells.
- It keeps the first implementation small enough to verify thoroughly.

Why not `block+` in v1:

- Rich block cells are more Notion-like, but pipe-table Markdown cannot
  faithfully represent nested paragraphs, lists, blockquotes, or code blocks.
- Bangle's current parser path would need special handling to wrap cell inline
  tokens in paragraphs.
- Serialization would need table-specific block flattening rules, which are
  easy to make lossy.

This does not permanently close the door on rich cells. It says rich cells
need a deliberate format strategy and migration story, not a quiet first
implementation.

### Node Names

Prefer the standard ProseMirror table node names:

- `table`
- `table_row`
- `table_cell`
- `table_header`

These names match the default `prosemirror-tables` model and make Markdown
parser specs straightforward. Revisit `packages/js-lib/banger-editor/src/drag/index.ts`
because it currently checks for a camelCase `tableRow` name in at least one
helper.

### Header Rows

Markdown pipe tables require a header row and delimiter row. Keep v1 simple:

- inserted tables should have a header row;
- imported Markdown tables should create `table_header` cells for the first
  row and `table_cell` cells for body rows;
- row and column operations should preserve that shape;
- do not expose "headerless table" UI in v1.

Header toggles from `prosemirror-tables` are useful references, but exposing
them can create a model that does not map cleanly back to pipe-table Markdown.
If a header toggle is added later, define exactly how it serializes and parses
back before shipping it.

### Plugins

Install `tableEditing()` for the actual editing semantics. Its plugin ordering
matters; ProseMirror's own docs recommend placing it after more specific
plugins so it can handle table behavior without swallowing unrelated input too
early.

Do not make persistent column resizing a v1 requirement. `columnResizing()` is
useful, but column widths are not part of standard pipe-table Markdown. If it
is added early, treat it as transient editor UI unless a nonstandard
persistence format is explicitly accepted and tested.

### Commands

Wrap `prosemirror-tables` commands in Bangle's extension command style instead
of calling them directly from React.

Likely command surface:

- insert table with configurable rows and columns;
- add row before;
- add row after;
- delete row;
- add column before;
- add column after;
- delete column;
- delete table;
- select row;
- select column;
- select table;
- set column alignment if alignment is included in v1.

Keep command names boring and explicit. A future agent should be able to read a
slash command or table handle component and immediately see which document
command it invokes.

### Keyboard Behavior

Implement the keyboard behavior users expect from tables before adding visual
polish:

- Tab moves to the next cell.
- Shift-Tab moves to the previous cell.
- Tab from the last cell should either add a new row or stop predictably. If
  adding a row, test the exact persisted Markdown after reload.
- Escape should allow the user to leave a handle/menu interaction without
  corrupting selection.
- Delete or Backspace behavior for selected rows, columns, or whole tables
  should use `prosemirror-tables` selection semantics, not custom DOM state.

Be careful with Enter and Shift-Enter. With inline-only cells, there is no
paragraph to split. Bangle's existing hard break serialization uses Markdown
hard-break syntax that can break table rows if reused naively. For v1, it is
acceptable to block hard breaks inside table cells or defer them, as long as
that behavior is deliberate and tested.

### Markdown Tokenizer

Enable the `markdown-it` table rule from the table extension:

```ts
markdown: {
  tokenizerPlugins: [
    (md) => {
      md.enable('table');
    },
  ],
}
```

Do this in the table extension, not in `core/editor/src/pm-setup.ts`.

The parser needs token handlers for the tokens emitted by `markdown-it` tables:

- `table_open` / `table_close`
- `thead_open` / `thead_close`
- `tbody_open` / `tbody_close`
- `tr_open` / `tr_close`
- `th_open` / `th_close`
- `td_open` / `td_close`
- existing `inline` token handling inside cells

The `thead` and `tbody` wrappers do not correspond to Bangle document nodes.
Ignore or skip them through the supported `prosemirror-markdown` parse spec
mechanism after confirming the exact local API.

Parse alignment from `th_open` and `td_open` token attributes. `markdown-it`
usually represents alignment as style text such as `text-align:center`.
Convert only the supported values:

- `left`
- `center`
- `right`
- `null`

Unknown alignment should become `null`, not an arbitrary stored string.

### Markdown Serializer

The serializer is the highest-risk part of the feature because it is on the
save path. Do not serialize table cells with `node.textContent`; that will
throw away links, marks, code spans, escapes, and possibly user data.

Serializer guidance:

- serialize each cell's inline content using the same Markdown mark and inline
  node rules used elsewhere;
- capture cell output into a string before assembling the row;
- escape pipe characters where needed;
- preserve inline code spans containing pipes;
- normalize line breaks intentionally, preferably by disallowing or flattening
  unsupported hard breaks in v1;
- generate the delimiter row from header cell alignment;
- keep rows rectangular, using empty cells only as an explicit recovery for
  malformed internal state;
- add tests for every normalization choice.

A simple output shape:

```md
| Name | Status |
| --- | --- |
| Alpha | Done |
| Beta | In progress |
```

Alignment output:

```md
| Left | Center | Right |
| :--- | :---: | ---: |
| a | b | c |
```

The exact spacing does not need to preserve the user's original column widths.
It does need to preserve semantic cell content.

### Paste And Input Rules

Parsing existing Markdown is mandatory. Live input conversion can be later.

V1 can skip auto-converting typed pipe-table text while the user is typing if
that keeps the implementation safer. A user can still paste or open Markdown
containing a table and have it parse through the normal document load path.

If paste conversion is added, use the same Markdown parser path rather than a
separate regexp parser.

### UI

Keep the first UI functional and compact:

- slash command entry to insert a default table, probably 3 columns by 3 rows
  with a header row;
- visible column handles for adding/deleting columns;
- visible row handles for adding/deleting rows;
- table-level delete action;
- optionally simple alignment controls if alignment is part of v1.

Use ProseKit as the main UX reference for handles, but implement in Bangle's
style:

- ProseMirror plugin derives hovered/selected table geometry.
- React component renders controls.
- Commands mutate the ProseMirror document.
- UI state should not become document state.

Do not build a separate table editor in React. React can render controls, but
the table itself should remain the ProseMirror document.

### Styling

Make tables readable in notes without turning them into a dashboard widget:

- visible cell borders;
- comfortable but dense padding;
- header row styling that is clear but quiet;
- selected cell, selected row, and selected column states;
- handles that appear near the table and do not shift document layout;
- mobile behavior that avoids overlapping controls with cell text.

The editor is a working writing surface. Avoid decorative cards, oversized
controls, and heavy color themes.

## Phased Implementation

### Phase 0: Reconfirm The Ground Truth

Before editing code, inspect the current versions of:

- `packages/js-lib/banger-editor/package.json`
- `packages/js-lib/banger-editor/src/pm/index.ts`
- `packages/js-lib/banger-editor/src/common/collection.ts`
- `packages/js-lib/prosemirror-plugins/src/markdown-loader.ts`
- `packages/core/editor/src/extensions.ts`
- `packages/core/editor/src/pm-setup.ts`
- `packages/core/editor/src/components/slash-command.tsx`

Then re-check `prosemirror-tables` version and its exported API. Do not rely
only on this plan if the code has moved.

### Phase 1: Schema, Parser, Serializer

Goal: a Markdown string with a pipe table loads into ProseMirror and serializes
back to equivalent Markdown without UI work.

Expected changes:

- add `prosemirror-tables` dependency to `banger-editor`;
- create `setupTable()` or equivalent in `packages/js-lib/banger-editor`;
- add table node specs using `tableNodes`;
- add Markdown tokenizer plugin to enable table parsing;
- add table parse specs;
- add table serializer;
- export the extension from the package root used by `core/editor`;
- register the extension in `packages/core/editor/src/extensions.ts`.

Tests to add early:

- simple table round trip;
- header plus body rows;
- empty cells;
- escaped pipes;
- inline code containing a pipe;
- links inside cells;
- emphasis and strong inside cells;
- alignment parse and serialize;
- malformed pipe-looking text remains non-table Markdown if `markdown-it` does
  not classify it as a table.

This phase should prove the storage format before any user-visible controls
make it easy to create tables.

### Phase 2: Commands And Keyboard

Goal: users and tests can create and edit tables through ProseMirror commands.

Expected changes:

- add command wrappers for insert/add/delete/select operations;
- add Tab and Shift-Tab handling;
- define behavior at the end of the table;
- ensure row and column operations preserve header-row semantics;
- update drag-node exclusions or helpers so table internals are not treated as
  generic draggable blocks.

Tests:

- command-level tests for insertion shape;
- row addition and deletion;
- column addition and deletion;
- Tab navigation, including last-cell behavior;
- serialization after each operation.

### Phase 3: Slash Command

Goal: users can create a table from the normal editor entry point.

Expected changes:

- add a Table entry in `packages/core/editor/src/components/slash-command.tsx`;
- use translated strings;
- call the table insert command;
- keep the default size modest, likely 3 columns by 3 rows including header.

E2E:

- create a note;
- invoke slash command;
- insert a table;
- type into multiple cells;
- verify stored Markdown;
- reload and verify visible table content.

### Phase 4: Table Handles

Goal: users can discover and operate row/column actions without memorizing
keyboard shortcuts.

Expected changes:

- create a table handle plugin or extend the table extension with hover state;
- derive table geometry using `prosemirror-tables` helpers such as `TableMap`,
  `cellAround`, and DOM position helpers where appropriate;
- render a React handle component from `core/editor`;
- keep menus stable while open;
- wire buttons to table commands;
- cover selection and focus edge cases.

E2E:

- add a row through the handle;
- add a column through the handle;
- delete a row;
- delete a column;
- reload and verify Markdown-backed persistence.

### Phase 5: Optional Polish After The Base Is Stable

Only consider these after parser, serializer, core commands, slash insertion,
and handles are well-tested:

- column alignment controls;
- select row/column/table affordances;
- copy/paste rows or columns;
- transient column resizing;
- converting selected text or CSV into a table;
- input rule for typed pipe-table Markdown;
- richer import recovery for malformed tables.

Each item needs its own Markdown persistence decision before it ships.

## Verification

Documentation-only changes to this plan do not require the code suites.
Implementation work does.

For code changes, follow the root `AGENTS.md` requirements:

- `pnpm lint:ci`
- `pnpm test:ci`
- relevant Playwright coverage for editor behavior and persistence
- `pnpm build` if dependency, browser bootstrapping, build config, theme, or
  production behavior changes require it
- `pnpm local-ci-check` before opening or updating a PR

Because table support affects editor behavior and Markdown persistence, a
release-ready feature must include a high-quality Playwright E2E test. Manual
smoke testing is useful but is not enough.

Suggested focused commands while iterating:

```bash
pnpm vitest packages/core/editor/src/__tests__/table-markdown.spec.ts
pnpm e2e:ci -- --grep table
pnpm lint:ci
pnpm test:ci
```

Adjust paths and filters to match the actual tests added. Do not invent a
passing command in the PR notes if a narrower local command was used.

### Manual Smoke

Before calling the feature done, manually exercise:

- create a browser workspace;
- create a note;
- insert a table from slash command;
- enter text, links, emphasis, and inline code in cells;
- add and delete rows and columns;
- reload;
- verify the visible table and stored Markdown still match expectations.

## Known Risks And Decisions

### Inline Cells Are A Deliberate Constraint

Inline-only cells are less powerful than Notion cells, but they are much more
compatible with Markdown pipe tables. Treat this as a product constraint, not
an implementation shortcut.

If a future agent wants block cells, they should first write down:

- how Markdown table cells parse into paragraphs;
- how multiple paragraphs serialize into one pipe-table cell;
- how lists, code blocks, and blockquotes degrade or persist;
- how existing inline-cell tables migrate.

### Hard Breaks Need A Specific Policy

`<br>` inside Markdown table cells is tempting, but the current Markdown parser
is configured with `html: false`. Local inspection showed that raw `<br>` in a
table cell is parsed as text, not as a hard break.

Do not serialize hard breaks as raw HTML unless the parser path is changed and
tested. Blocking hard breaks in table cells for v1 is acceptable.

### Column Widths Are Not Markdown

`prosemirror-tables` can support column widths through attrs and
`columnResizing()`, but standard pipe tables cannot persist those widths.

If resizing lands, either:

- keep it transient and accept that reload resets widths, or
- define a nonstandard Markdown-compatible metadata format and test it heavily.

Do not accidentally store widths in a way that makes ordinary Markdown files
ugly or fragile.

### Merged Cells Are Not V1

Merged cells rely on `colspan` and `rowspan`, which pipe-table Markdown cannot
represent. Keep merge/split commands out of released UI until Bangle has a
format strategy for them.

### Parser Enablement Must Be Extension-Owned

Do not repeat the old spike's `pm-setup.ts` parser mutation. The extension
should provide the tokenizer plugin through the collection API.

### Serializer Bugs Are Data Bugs

Table serialization runs during normal save. A bad serializer can rewrite a
note incorrectly even if the user only clicked in the document. Round-trip
tests are mandatory before UI exposure.

## Acceptance Criteria

The first released version should satisfy all of these:

- Existing Markdown pipe tables load as editable tables.
- Edited tables serialize back to pipe-table Markdown.
- Inline marks and links inside table cells survive round trips.
- Escaped pipes and inline code containing pipes survive round trips.
- A user can insert a table from the editor UI.
- A user can add and remove rows and columns from visible controls.
- Keyboard navigation between cells works.
- Reloading the note preserves table content and structure.
- Unsupported table features are unavailable rather than silently lossy.
- `pnpm lint:ci`, `pnpm test:ci`, and the relevant Playwright coverage pass.

## Next Steps

1. Re-read the files listed in "Current Status" and "Reference Projects".
2. Confirm the current `prosemirror-tables` package version and API.
3. Start with schema, parser, serializer, and round-trip tests.
4. Register the extension only after the Markdown path is covered.
5. Add command wrappers and keyboard behavior.
6. Add slash command insertion.
7. Add handle UI using ProseKit as the UX reference.
8. Finish with E2E persistence coverage and the required repo checks.
