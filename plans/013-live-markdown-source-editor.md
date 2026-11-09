---
title: Live Markdown source editor with rich visual formatting
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-12
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/630
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/527
---

# Live Markdown Source Editor

## Summary

Build a CodeMirror 6-powered **Live Markdown** mode beside Bangle's existing
rich editor. Live Markdown edits the note's actual Markdown bytes, but uses
syntax-aware styling and small widgets so the document still reads like a
formatted note:

- headings retain rich-editor typography while `###` becomes a quiet `H3`
  marker outside the active heading;
- bold, italic, strike, inline code, and links look formatted while their
  delimiters collapse outside the active construct;
- moving the caret into a construct reveals its exact Markdown immediately;
- lists, tasks, blockquotes, code fences, frontmatter, tables, wiki links, and
  assets keep source-level editability and receive progressively richer chrome;
- switching between **Rich** and **Live Markdown** is an in-place surface swap,
  not a reload and not a reread from storage.

This is deliberately a mode, not a third rich-editor engine. The selected rich
engine remains ProseMirror or Wordgard; `rich | live-markdown` sits one level
above it. Both surfaces share one exact Markdown session, one load state, and
one ordered save queue. This is the only architecture that makes the toggle
instant without creating two competing copies of the note or duplicating
data-critical persistence logic.

The first generally available release keeps **Rich** as the default. Live
Markdown is a user choice and the safe editable fallback when a rich engine
cannot preserve a note.

## Current status

Planned; no implementation has started.

Repository support already in place:

- `EditorEngineContract` is Markdown-centric and intentionally designed to
  admit a source editor (`packages/core/context/src/service-types.ts`).
- `EditorSurface` is the single app-layer editor switch point
  (`packages/core/app/src/components/editor-surface.tsx`).
- the current save queue already accepts serialized Markdown strings and
  coalesces writes (`packages/core/editor/src/editor-save-queue.ts`);
- the ProseMirror engine already computes a load-time round-trip fidelity
  result (`packages/core/editor/src/round-trip-check.ts`);
- plan 011 already calls for an engine-neutral `editor-common` package, but
  postpones the extraction until Wordgard M2. Live Markdown is now the second
  concrete consumer, so that extraction is no longer speculative and should
  move forward as shared foundation;
- `@bangle.io/markdown-syntax` and the shared Markdown golden corpus give us
  the canonical syntax contract against which Live Markdown decorations can be
  checked.

No CodeMirror package is currently installed. It must be added only to the new
source-editor package and loaded as a separate browser chunk.

## Product decisions

These decisions are part of the plan and should not be reopened in individual
implementation PRs without new evidence.

### 1. Call the mode “Live Markdown”

The UI labels are **Rich** and **Live Markdown**. “Source mode” is accurate
internally but undersells the formatted experience; “preview” is inaccurate
because the displayed text is directly editable.

### 2. Markdown remains visible and authoritative

Live Markdown never converts the note into HTML or a rich document model. A
CodeMirror document plus a lossless line-ending sidecar is the editable source
of truth. Decorations may style, compact, or temporarily replace syntax in the
DOM, but they never mutate source text.

### 3. Exact syntax reveals at the caret

The active construct, not merely the active line, reveals its delimiters. When
the selection spans multiple constructs, reveal every intersected construct.
During pointer drag, IME composition, or an incomplete parse, prefer showing
raw syntax over hiding too much.

### 4. Heading markers become small semantic badges

Outside the active heading, `#` through `######` render as a muted `H1` through
`H6` badge and the heading text uses the same size/weight scale as the rich
editor. Inside the heading, the exact marker and spacing reappear for direct
editing. This is more legible than showing several tiny hash characters and
still communicates the stored level.

### 5. Switching is instant and per tab

The toggle changes only the current tab. It updates
`?editorMode=rich|live-markdown` with history replacement so the mode survives
reload and ordinary navigation in that tab. Other tabs do not switch. Missing
or invalid values default to `rich`.

The mode follows the tab when the user opens another note. It is not written
into note content, workspace metadata, or a cross-tab synced preference.

### 6. Rich remains the default

Live Markdown will not silently replace the existing editing experience. Once
the mode is generally available, the app header gains a compact toggle and
omni-search gains `command::ui:toggle-editor-mode`. Rich stays the default for
new tabs and links without an explicit mode query.

### 7. A failed rich handoff stays safe

Rich → Live Markdown is always permitted because the current in-memory
Markdown snapshot can be edited directly. Live Markdown → Rich first runs the
selected rich engine's parse/serialize gate against the current snapshot. If
the gate fails or parsing throws, the user remains in Live Markdown with the
source and selection untouched and gets a precise explanation.

The first release does not include a “switch anyway and normalize” escape
hatch. That requires a reviewed diff UI and explicit overwrite semantics; it
must not be smuggled into a confirmation dialog.

### 8. Switching creates an undo-history boundary

Content, focus, selection intent, and scroll position carry across. Native
ProseMirror/Wordgard and CodeMirror undo stacks do not. After a switch, undo
applies only to edits made in the active mode. Building a cross-engine semantic
history is disproportionate and unsafe for v1. The switch itself does not add
or remove content and does not enqueue a synthetic write.

### 9. No split view in v1

There is one mounted editing surface. A side-by-side source/preview view would
reintroduce mirrored state, scroll synchronization, and conflicting selection
ownership. It is a separate product feature, not a stepping stone for this
mode.

## Experience specification

### Entry points and state

- Add one icon button to `AppHeader` beside the wide-editor control. It uses
  `aria-pressed`, has a visible tooltip (“Switch to Live Markdown” / “Switch
  to Rich”), and is hidden when no Markdown note is open.
- Add the omni-search command `command::ui:toggle-editor-mode` with keywords
  `markdown`, `source`, `live`, `rich`, and `editor`.
- Do not assign a default keyboard shortcut in the first release. The app has
  very little shortcut-space documentation today, and a browser/OS collision
  would make a supposedly seamless toggle unreliable. A later shortcut should
  be configured through the command system, not hard-coded in CodeMirror.
- The editor root keeps `data-editor-engine="prosemirror|wordgard"` and adds
  `data-editor-mode="rich|live-markdown"`. E2E helpers should locate the neutral
  editor root rather than `.ProseMirror`.
- While the CodeMirror chunk loads for the first time, keep the outgoing rich
  surface mounted and editable. Swap only after the source adapter is ready.
  If loading fails, leave the outgoing surface intact and show an error toast.

### Syntax presentation

| Construct | Inactive presentation | Active/editing presentation |
| --- | --- | --- |
| ATX heading | Rich heading typography; marker replaced by small `H1`–`H6` badge | Exact hashes and required spacing shown; typography remains heading-sized |
| Setext heading | Rich heading typography; quiet `H1`/`H2` badge | Exact underline marker shown |
| Bold / italic / strike | Content styled; delimiter glyphs visually collapsed | Exact delimiters shown for the intersected mark run |
| Inline code | Monospace chip matching current theme; backticks collapsed | Exact adaptive backtick fence shown |
| Markdown link | Label styled as link; destination compacted to a link affordance | Exact `[label](target "title")` source shown |
| Wiki link | Label styled with resolved/unresolved state; brackets compacted | Exact `[[target|label]]` source shown |
| Image | Source line remains addressable; optional small preview below/after line | Exact `![alt](target "title")` source shown; preview does not steal selection |
| Bullet/ordered list | Marker is quiet but visible; continuation indentation preserved | Exact marker and whitespace shown on the active item |
| Task item | Accessible checkbox widget plus task text | Exact `[ ]`/`[x]` marker shown when caret enters marker or item prefix |
| Blockquote | Subtle left rule and inherited typography | Exact `>` prefixes shown for active lines |
| Fenced code | Monospace block; fence/language label quiet; code syntax highlighted when available | Exact fence and info string shown on active fence lines; code bytes always visible |
| Frontmatter | Monospace metadata block with a small `frontmatter` label | Exact opening/closing fence and YAML text shown |
| Table | Source-aligned, monospace rows with quiet delimiter styling; no fake HTML grid in v1 | Exact pipes, escapes, and delimiter row always editable |
| Horizontal rule | Rendered rule with a compact source affordance | Exact marker run shown |
| Raw HTML / unknown syntax | Raw source, syntax highlighted only when confidently recognized | Raw source |

Rules common to every construct:

- incomplete, invalid, or ambiguous Markdown remains raw;
- decorations never cross a code span/fence boundary unless the syntax tree
  says the construct is outside code;
- replacement widgets are atomic for cursor motion only while collapsed;
- pressing Backspace/Delete next to a collapsed marker reveals it before a
  destructive edit rather than deleting an invisible range unexpectedly;
- paste and drag/drop operate on source positions, never DOM widget content;
- selection color and caret contrast must remain clear in both themes.

### Rich-editor fidelity recovery

The current ProseMirror warning says a save may reformat unsupported Markdown.
Once Live Markdown exists, that notice should add **Edit safely in Live
Markdown**. A rich parse failure should likewise offer **Open in Live
Markdown** using the already-read exact source; it must not reread the file or
write fallback content.

No automatic mode switch occurs. The user chooses the recovery surface, and a
failure stays visible for diagnostics.

### Selection and scroll handoff

Define a surface-neutral bookmark:

```ts
type EditorBookmark = {
  markdownAnchor: number;
  markdownHead: number;
  affinity: 'forward' | 'backward';
  viewportAnchor: {
    markdownOffset: number;
    yRatio: number;
  };
};
```

CodeMirror maps this exactly. Rich adapters must map their selection to and
from Markdown offsets. For ProseMirror, build the mapping in the Markdown
serializer/parser boundary rather than guessing from DOM coordinates or
searching for selected text. If the selected engine cannot provide an exact
mapping for a construct, fall back in this order:

1. same Markdown block start;
2. same heading/paragraph text offset;
3. nearest valid text position;
4. start of document.

Acceptance is not pixel-perfect scroll equality. The caret must land in the
same textual block, the active selection text must remain selected when it has
an unambiguous mapping, and the old viewport anchor must remain visible.

## Architecture

### Mode sits above the selected rich engine

```text
                         core/app
                AppHeader + EditorSurface
                            |
                    EditorEngineContract
                  (active editing facade)
                            |
             @bangle.io/editor-common runtime
       exact Markdown session · load state · save queue
              mode switch · bookmark handoff
                  /                         \
       selected rich adapter          source adapter
       ProseMirror or Wordgard         CodeMirror 6
```

`editorEngine` remains the public service slot for compatibility. Its
`engineId` continues to identify the selected rich engine. Add a separate
`EditorSurfaceMode` type and observable mode state; do not overload `engineId`
with `codemirror-source`.

### New `@bangle.io/editor-common` package

Create `packages/core/editor-common` as a browser `core` package. It owns only
engine-neutral editing policy:

- `EditorDocumentSession`: exact current Markdown, monotonically increasing
  revision, file identity, newline metadata, load status, current bookmark,
  and active mode;
- `EditorSaveQueue`: move the current implementation and its tests here; all
  surfaces enqueue strings through the same instance;
- mode-switch transaction orchestration and rollback;
- engine-neutral `<EditorShell>` load/error/save/fidelity notices;
- save-status subscription glue and cleanup tied to the root abort signal;
- small internal contracts for `RichSurfaceAdapter` and
  `SourceSurfaceAdapter`.

It must not import ProseMirror, Wordgard, CodeMirror, an editor schema, or a
concrete editor component. `core/editor` and `core/editor-w` provide rich
adapters; `core/editor-source` provides the source adapter.

The session is the only owner of the mutable Markdown snapshot. A surface
receives a snapshot plus an `applyMarkdownUpdate` callback tagged with the base
revision. The runtime rejects or rebases stale updates rather than allowing an
old surface completion to replace a newer source revision.

### New `@bangle.io/editor-source` package

Create `packages/core/editor-source` as a browser `core` package. It owns:

- CodeMirror state/view creation and teardown;
- the Markdown language configuration and Bangle syntax extensions;
- Live Markdown decorations and widgets;
- source selection, focus, folding, copy/paste, history, and bookmark mapping;
- Bangle-aware callbacks for opening resolved links/wiki links and resolving
  asset previews, injected rather than imported from a rich engine;
- theme variables that visually align with
  `packages/core/editor/src/typography.css` without depending on PM classes.

It does **not** read or write files, own save status, navigate on mount, or
import `core/editor`/`core/editor-w`.

Use granular CodeMirror packages (`@codemirror/state`, `@codemirror/view`,
`@codemirror/commands`, `@codemirror/language`,
`@codemirror/lang-markdown`, and only the optional modules actually used)
rather than the all-in-one basic setup. Pin the first known-good versions in
the lockfile and upgrade them as a group.

Load this package with a dynamic import. A user who never selects Live
Markdown should not pay its parse/view bundle cost on initial boot. Verify the
chunk boundary with `pnpm build`.

### Internal adapter contracts

The exact names can evolve during M1, but the ownership must stay equivalent
to this shape:

```ts
type MarkdownSnapshot = {
  wsPath: string;
  revision: number;
  text: string;
  lineEndings: LineEndingMap;
};

type EditorSurfaceAdapter = {
  mount(params: {
    domNode: HTMLElement;
    snapshot: MarkdownSnapshot;
    bookmark?: EditorBookmark;
    onChange(update: MarkdownUpdate): void;
    onBookmarkChange(bookmark: EditorBookmark): void;
  }): { destroy(): void };
  focus(): void;
  getBookmark(): EditorBookmark | undefined;
  getSelectionMarkdown(): string | null;
  insertMarkdownAtSelection(markdown: string): boolean;
};

type RichSurfaceAdapter = EditorSurfaceAdapter & {
  checkRoundTrip(snapshot: MarkdownSnapshot):
    | { ok: true }
    | { ok: false; reason: 'parse' | 'serialize' | 'mismatch'; error?: Error };
};
```

Folding is a capability, not a required adapter method. Heading commands query
the active adapter capability: rich engines fold semantic sections; Live
Markdown uses CodeMirror folding where available; unsupported commands return
`false` without pretending success.

### Public contract changes

Extend `EditorEngineContract` narrowly:

- `readonly surfaceMode: EditorSurfaceMode` or an equivalent read atom used by
  React without polling;
- `setSurfaceMode(mode): Promise<SurfaceModeSwitchResult>`;
- `toggleSurfaceMode(): Promise<SurfaceModeSwitchResult>`;
- generic fidelity state so `EditorShell` does not depend on
  `PmEditorService.$roundTripWarnings`;
- a stable neutral editor-root hook.

Do not expose CodeMirror/ProseMirror/Wordgard state or view types. Do not move
rich-only APIs such as `getEditor()` or extension registries onto the public
contract.

### One exact Markdown session

Load and change flow:

1. `EditorDocumentSession` reads the file exactly once through
   `FileSystemService` and records the original newline layout.
2. The selected initial surface mounts from that snapshot.
3. Each surface change synchronously produces the next Markdown revision.
   The session updates first, then enqueues that exact string for persistence.
4. A mode switch captures a bookmark, prepares the incoming adapter against
   the latest in-memory revision, and swaps only after preparation succeeds.
5. The save queue continues across the swap. Mode changes neither wait for a
   storage round trip nor bypass pending/failed-save protection.
6. If mounting the incoming adapter fails, destroy the partial mount, restore
   the outgoing adapter from the same latest revision/bookmark, and preserve
   the pending save state.

This eliminates the dangerous alternative of “save, unmount, reread, mount,”
which could lose an unsaved revision or race external storage.

### Line-ending fidelity

CodeMirror can preserve one configured separator exactly, but a document may
contain mixed `LF`, `CRLF`, and legacy `CR` boundaries. Live Markdown claims
losslessness, so mixed files cannot be normalized silently.

`LineEndingMap` must:

- normalize line boundaries to CodeMirror positions while retaining the
  original separator for each unchanged boundary;
- update boundary metadata through CodeMirror change sets;
- use the nearest surrounding separator for inserted newlines, falling back
  to the document's dominant separator and then `LF`;
- remove metadata only for deleted boundaries;
- reconstruct the exact original string when no edit occurred;
- preserve BOM, trailing newline count, tabs, trailing spaces, and Unicode
  code points.

Uniform files should use CodeMirror's `EditorState.lineSeparator` directly.
Mixed files use the sidecar. Unit fixtures must prove both paths. This belongs
in `editor-common` because the session, not a decoration plugin, owns bytes.

### Syntax and decoration policy

Use CodeMirror's incremental Markdown language tree for editor-local structure
and extend it for Bangle syntax (frontmatter and wiki links). Standard GFM
support is useful for tables/tasks, but it is not the durable syntax authority.
`@bangle.io/markdown-syntax` remains authoritative for how stored notes are
interpreted by Bangle.

Therefore:

- decorations are conservative and cosmetic;
- every decorated construct gets fixtures cross-checked against the shared
  Markdown corpus/tokenizer;
- if CodeMirror and `markdown-syntax` disagree, render raw source for that
  range until the parser extension is corrected;
- never “repair” syntax in a view plugin;
- build decorations over visible ranges where possible; layout-changing block
  widgets use state-backed decoration sets as required by CodeMirror;
- use `atomicRanges` only for collapsed replacement ranges, and remove them as
  soon as selection/composition intersects the construct.

### Link, wiki-link, and asset behavior

Live Markdown keeps editing mechanics local to CodeMirror:

- ordinary click positions the caret; primary-modifier click opens a resolved
  link through an injected callback, matching current rich-editor behavior;
- wiki link resolution consumes workspace data through a narrow callback and
  visually distinguishes unresolved targets;
- pasting a URL over selected text may use CodeMirror's Markdown paste helper
  only if its output matches Bangle's canonical link rules;
- file paste/drop reuses shared asset-storage policy, but source insertion is
  a CodeMirror transaction. It must preserve selection on partial failure and
  clean up stored assets if Markdown insertion fails;
- image previews are decorations backed by the same safe blob resolution used
  by the app. They never replace the only editable source representation and
  must release object URLs on update/unmount.

Asset paste/drop is M4, not a blocker for the first experimental source
editor. Plain-text and Markdown paste are required in M2.

### Cross-tab and external changes

- Mode is tab-local; switching one tab must not reload or remount another.
- Existing cross-tab storage notifications continue through the shared
  session. If an external change arrives while the local session is clean,
  remount/update the active surface using the existing reload semantics.
- If local content is pending or failed, never replace it with an external
  snapshot. Keep local text and surface the conflict/recovery path.
- Do not broadcast mode changes through `root-emitter`.

## Milestones

Each milestone should be a small sequence of mergeable PRs, not one feature
branch. Every released behavior gets a committed Playwright E2E workflow.

### M0 — Technical proof and contracts

Build a disposable Storybook/component-test proof before restructuring the
editor service. It must demonstrate:

- a heading with the `H3` compact marker and rich typography;
- bold/italic delimiters collapsing and revealing at the caret;
- atomic cursor behavior around collapsed markers;
- IME composition with decorations suspended for the active construct;
- uniform `LF`/`CRLF` round trip and a working mixed-line-ending sidecar
  prototype;
- a dynamically loaded CodeMirror chunk;
- a 1–2 MB fixture remaining editable with decorations limited to visible
  ranges.

The proof is an evidence gate, not production architecture. Delete it or fold
its reusable parts into `editor-source` when M2 lands.

Exit: no unresolved CodeMirror API limitation threatens byte fidelity,
composition, or the requested visual interaction.

### M1 — Extract the shared editor session (no UX change)

1. Create `@bangle.io/editor-common`.
2. Move `EditorSaveQueue` and its tests without semantic changes.
3. Extract file load state, failure handling, save-status subscription, and
   editor shell behavior from `PmEditorService`/`core/editor`.
4. Introduce `EditorDocumentSession` and route ProseMirror's serialized
   Markdown revisions through it.
5. Add internal adapter boundaries while keeping ProseMirror as the only
   mounted production surface.
6. Generalize fidelity state and neutral editor test hooks.
7. Update plan 011's M2 implementation to consume this package rather than
   repeating the extraction in editor-w.

Exit: current rich-editor behavior and persistence are unchanged; PM no longer
owns the save queue/load shell; a fake source adapter can mount against the
same session in unit tests; no engine-specific type leaks into editor-common.

### M2 — Exact source mode and transactional switching

1. Create `@bangle.io/editor-source` with a deliberately plain CodeMirror
   Markdown surface: syntax highlighting, editing, selection, search, native
   history, list continuation, and source folding; no collapsed syntax yet.
2. Implement uniform and mixed line-ending preservation.
3. Add `EditorSurfaceMode`, URL parsing/preservation, contract methods, mode
   switch transaction, dynamic import, rollback, bookmark handoff, and
   `data-editor-mode`.
4. Add the omni-search command. Keep the app-header toggle hidden behind the
   experimental query entry until M3 makes the mode visually differentiated.
5. Implement generic copy-selection/paste-Markdown/heading-fold capability so
   existing app commands act on the active surface.
6. Add Live Markdown actions to rich fidelity/load-failure notices.
7. Block Live → Rich on a failed round-trip gate without changing the source.

Exit: users can edit any Markdown source safely, switch in place in both
directions for a round-trippable note, survive rapid edits plus switching, and
reload with exact saved bytes and the same tab-local mode.

### M3 — Core Live Markdown visual language

Implement conservative decorations for:

- ATX and setext headings with `H1`–`H6` badges;
- bold, italic, strike, inline code;
- bullet/ordered lists and blockquotes;
- links and horizontal rules;
- fenced/indented code blocks and frontmatter;
- syntax reveal for cursor, range selection, drag selection, and composition;
- light/dark theme parity with current editor typography.

Add the app-header toggle and user-facing translations here. The mode is now
usable as designed, but remains labeled experimental.

Exit: the visual behavior in the experience table is covered by component
tests and a user-observable E2E workflow; keyboard editing never becomes
trapped by collapsed syntax; unknown constructs remain raw.

### M4 — Bangle constructs and local-first workflows

Add:

- task-checkbox widgets whose click produces an ordinary undoable source
  transaction;
- wiki-link parse/decorations, resolved state, suggestions, and
  modifier-open;
- image preview decorations and asset-link opening;
- file paste/drop using shared asset storage and partial-failure cleanup;
- table-aware source styling without replacing the source with an HTML table;
- code-language highlighting loaded on demand;
- frontmatter-specific polish and raw HTML guardrails;
- heading navigation and collapsible/fold commands.

Exit: the normal Bangle workflows for tasks, wiki links, images/assets, tables,
code, and frontmatter work without leaving Live Markdown or changing bytes the
user did not edit.

### M5 — Hardening and general availability

- Run real-device mobile keyboard/IME testing, including iOS Safari and an
  Android Chromium keyboard.
- Run VoiceOver keyboard and announcement testing; verify widget accessible
  names and the ability to reveal exact syntax.
- Profile large notes and long lines; fix decoration work that scales with the
  whole document on ordinary keystrokes.
- Verify touch selection, clipboard, drag/drop, find/replace, browser zoom,
  reduced motion, and high-contrast themes.
- Complete neutral E2E helper migration away from `.ProseMirror`.
- Remove the experimental label only after a soak period with no data-loss,
  IME, or unrecoverable-selection reports.

Exit: all gates below pass, Live Markdown is available from the normal toolbar,
and Rich remains the default.

## Verification

### Unit and contract tests

`editor-common`:

- save ordering/coalescing/retry behavior remains identical to current tests;
- revision rejection prevents stale surface updates;
- switch preparation, commit, rollback, and cleanup paths;
- rich-gate mismatch/parse/serialize failures leave source and mode untouched;
- pending/failed saves survive a switch;
- bookmark fallback ordering;
- uniform `LF`, `CRLF`, `CR`, mixed boundaries, BOM, no final newline, multiple
  final newlines, trailing spaces, tabs, and Unicode round-trip fixtures;
- external change while clean vs dirty/failed.

`editor-source`:

- syntax-tree range classification for every decorated construct;
- active-construct reveal and ambiguous/incomplete raw fallback;
- atomic ranges disappear before caret/composition edits;
- task/widget changes produce source transactions and undo correctly;
- selection Markdown and insertion semantics;
- object URL/widget cleanup and aborted async preview work;
- decoration output checked against relevant shared golden-corpus fixtures.

### Component tests

Use Playwright component tests with the real CodeMirror view for behavior that
happy-dom cannot prove:

- exact `H1`–`H6` badge/typography and active marker reveal;
- overlapping emphasis and links;
- mouse/keyboard selection across replaced decorations;
- Backspace/Delete/Enter/Tab at construct boundaries;
- task checkbox click, focus retention, and undo;
- IME composition events;
- light/dark visual contrast and narrow/mobile layout;
- accessible toggle/widget roles and names.

### Required E2E workflows

At minimum, committed E2E coverage must prove:

1. create a Browser workspace and note in Rich, type formatted content, switch
   to Live Markdown, edit the literal source, switch back, reload, and verify
   both rendered behavior and exact persistence;
2. make rapid edits and switch while a write is pending; verify the latest
   revision wins and save protection remains correct;
3. open a fixture the rich editor cannot round-trip, edit it in Live Markdown,
   verify Live → Rich is blocked, reload, and confirm unsupported source bytes
   remain intact;
4. preserve caret/selection in the same textual block and keep the viewport
   anchor visible across both switch directions;
5. switch one tab while a second tab remains mounted in its existing mode;
6. toggle a task, edit a wiki link, and paste an asset in Live Markdown, then
   reload and verify the stored Markdown and visible result;
7. simulate a failed save, switch modes, retry, and prove unsaved content was
   never replaced or reported as saved.

### Repository gates

For each code PR:

- focused Vitest/component/E2E tests while iterating;
- `pnpm lint:ci`;
- `pnpm test:ci`;
- `pnpm build` for CodeMirror dependencies, dynamic chunks, and browser
  production behavior;
- relevant Playwright suite;
- `pnpm local-ci-check` before opening or updating the PR.

Before release, use `playwright-cli` against the release candidate to exercise
the affected workflows plus the required local-first persistence smoke. Repeat
the feature/persistence smoke after deployment per root `AGENTS.md`.

### Performance acceptance

- Decoration recalculation on ordinary typing must be limited to changed and
  visible ranges; no full-document regex scan per keystroke.
- Establish a checked benchmark fixture at 2 MB plus pathological long lines.
  Record baseline parse/mount, typing, and scroll timings before setting CI
  regression thresholds; do not invent a flaky absolute timer gate.
- Manual M5 acceptance: sustained typing and scrolling on the benchmark note
  produces no visible multi-frame stalls on the supported baseline laptop and
  mobile devices, and memory returns after editor unmount.
- Confirm through the production build that CodeMirror is absent from the
  initial Rich-only chunk and loaded once on first Live Markdown use.

## Scope

- Live Markdown editing for Markdown notes.
- Exact source persistence and safe rich/source handoff.
- Core Markdown rich visuals and Bangle-specific syntax chrome.
- Toolbar/command switching, per-tab URL state, focus/selection/scroll intent.
- Reuse of existing local-first save, link, wiki-link, asset, and command
  policies at the correct architectural layer.
- ProseMirror support first; Wordgard support automatically follows once its
  writable adapter consumes editor-common.

## Out of scope

- Replacing ProseMirror or changing the Wordgard migration decision.
- A third engine selected through `editorEngine=`.
- Split source/preview panes.
- Cross-mode shared undo history.
- A general plugin API for arbitrary Live Markdown decorations.
- Full WYSIWYG table layout inside CodeMirror.
- Persisting mode in note frontmatter or workspace files.
- Normalizing unsupported Markdown or offering “switch anyway” without a diff.
- Editing non-Markdown assets.
- Changing Bangle's Markdown dialect; plan 012 owns syntax feature expansion.

## Coordination with existing plans

### Plan 011 — Wordgard/editor-w migration

- Pull `editor-common` extraction forward as shared foundation; implement it
  once under this plan and mark the corresponding plan 011 M2 item consumed.
- Live Markdown is orthogonal to the rich engine. The URL dimensions are:
  `editorEngine=prosemirror|wordgard` and
  `editorMode=rich|live-markdown`.
- Ship ProseMirror + Live Markdown first if Wordgard is not writable yet.
  Wordgard gains Live Markdown only after it implements the shared session,
  bookmark, and strict round-trip adapter contracts.
- Do not let editor-w copy the save queue or build its own source mode.
- The rich-engine reload switch remains appropriate; the mode toggle is the
  lighter in-place swap already anticipated by plan 011.

### Plan 012 — Markdown feature parity

- Live Markdown may safely edit syntax that a rich engine does not yet support,
  but it should render such syntax raw until Bangle's authoritative syntax
  layer recognizes it.
- New constructs in plan 012 require decoration-classification fixtures only
  when this mode adds visual treatment for them.
- A tokenizer or canonical-form change must update the shared corpus before
  Live Markdown hides or compacts the affected syntax.

### Plans 006, 008, and 010

- Asset paste/storage semantics remain owned by plan 006/current shared asset
  services; source mode provides only the CodeMirror transaction adapter.
- Plan 008 remains the Markdown table behavior authority; Live Markdown does
  not create a parallel table dialect.
- Plan 010 heading collapse stays a generic command/capability. Rich engines
  use semantic heading collapse; Live Markdown uses source folding and must not
  persist fold state into Markdown.

## Risks and mitigations

- **Source normalization despite the lossless claim.** Mitigation: session-level
  line-ending metadata, exact fixed-point fixtures, and no serialization step
  in the source adapter.
- **Two live editors race each other.** Mitigation: one mounted adapter, one
  revisioned session, transactional swap, stale update rejection.
- **Collapsed syntax makes editing surprising.** Mitigation: conservative
  parsing, construct-level reveal, raw fallback, atomic ranges only while
  collapsed, real browser component/E2E tests.
- **IME breaks around replacement decorations.** Mitigation: suspend collapsed
  replacements intersecting composition; real-device gate before GA.
- **CodeMirror and Bangle disagree on Markdown meaning.** Mitigation:
  `markdown-syntax` stays authoritative; mismatched ranges render raw; shared
  corpus cross-checks.
- **Bundle growth affects every user.** Mitigation: dynamic source chunk and
  production build inspection.
- **Mode refactor destabilizes proven persistence.** Mitigation: behavior-free
  M1 extraction, reuse existing save queue tests, focus data-path tests, and no
  simultaneous Wordgard/source rewrite in the same PR.
- **Selection mapping is approximate.** Mitigation: serializer/parser mapping
  at the rich boundary, explicit fallback order, user-observable handoff tests.
- **Rich gate blocks legitimate switching.** Mitigation: Live Markdown remains
  fully editable; report the reason; design a separate diff-backed override
  only with evidence that it is needed.
- **Source feature work duplicates rich UI.** Mitigation: share policy and
  callbacks, not DOM/editor mechanics. CodeMirror interactions stay in
  editor-source; app services remain engine-neutral.

## Known blockers

No blocker prevents M0 or the ProseMirror-first path.

Wordgard + Live Markdown integration depends on plan 011 M2 producing a
writable Wordgard rich adapter. General availability also depends on successful
real-device IME/mobile and accessibility validation; those are exit gates, not
reasons to delay the earlier experimental milestones.

## Next steps

1. Build the M0 CodeMirror proof with heading/emphasis reveal, composition,
   mixed line endings, dynamic loading, and a large-note fixture.
2. Review the proof results and freeze the internal adapter contracts.
3. Implement M1 as a behavior-preserving `editor-common` extraction.
4. Land the M2 exact source editor behind `editorMode=live-markdown` with the
   full persistence/switching E2E before adding visual compaction.
