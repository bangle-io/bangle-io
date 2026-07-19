---
title: Block handle & slash menu hardening follow-ups
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-12
updated: 2026-07-19
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/633
  - https://github.com/bangle-io/bangle-io/pull/656
related_issues: []
---

# Block Handle & Slash Menu Hardening Follow-ups

## Summary

PR #633 shipped the Notion-style editor UX: guidance placeholders, the
icon/description slash menu backed by `slash-items.ts`, the `[+][⠿]` block
handle cluster, context-aware table actions shared with the hover table menu
(`table-actions.ts`), editor commands in omni search, and a round of review
fixes (per-view handle state, input-rule chunk-boundary corruption, synthetic
trigger Escape, IME Enter guard, empty-block reuse).

An external review comparing tiptap, ProseKit, Atlaskit, BlockNote, and
Milkdown identified further hardening patterns that were deliberately deferred
to keep the PR scoped. This plan records them with enough context to pick up
cold. A matching draft task exists on the Bangle 2 project board
("Editor block-handle & slash menu hardening follow-ups", Backlog / Medium /
Large / Editor).

## Current status

Partially complete. PR #656 completed item 6 by adding a typed editor-engine
availability contract, hiding unavailable omni editor commands, retaining the
last-focused live editor across external-focus handoffs, and revalidating at
execution. Items 1-5 and 7-8 remain in Backlog; none block release of the
merged PR #633 behavior.

## Scope

Work areas, roughly in priority order. Each item should land with its own
tests and can ship independently.

### 1. Track the hovered block as a mapped ProseMirror position

`packages/js-lib/banger-editor/src/drag/drag-handle-view.ts` records the
hovered block as a DOM element per view (`WeakMap<EditorView, …>`). DOM
identity goes stale when edits replace the node between hover and click; the
`isConnected` guard only catches removal, not replacement. Reference
implementations (tiptap, ProseKit) store `{node, pos}` and map `pos` through
transactions.

- Store the hovered block's position at mousemove time; map it through
  `tr.mapping` in a plugin `apply`/`view.update` step.
- `addBlockNextTo` and `handleDragStart` consume the mapped position; keep the
  DOM node only as a render hint for the drag image.
- Note the architectural constraint discovered in review: bangle shares
  extension/plugin instances across editor views, so per-plugin-instance state
  (tiptap's approach) would reintroduce the cross-editor bug. Keep the state
  keyed by `EditorView`.

### 2. Coalesce mousemove work behind requestAnimationFrame

`drag-handle.ts` runs `document.elementsFromPoint`, `getComputedStyle`,
`getBoundingClientRect`, and orientation math on every mousemove. Tiptap uses
a single RAF; ProseKit/Milkdown throttle. Store the pending event, schedule
one RAF, and cancel it on hide/destroy (add the pending handle to the
per-view state from item 1).

### 3. Use view.root for hit-testing

`nodeDOMAtCoords` in `drag/helpers.ts` uses the global
`document.elementsFromPoint`. Use `view.root` (Document or ShadowRoot) so the
logic survives shadow DOM and multiple documents, and so hit-testing cannot
land in another editor.

### 4. Hide handles during range selections and composition

The handle currently shows regardless of selection shape. Adopt the
ProseKit/Milkdown/Atlaskit rules: hide while a non-empty selection exists,
while `view.composing`, and keep the existing `view.editable` gate.
Scroll-hiding already exists via the `mousewheel` handler; further scroll
polish is optional.

### 5. Explicit nested-block handle policy

List items (`prosemirror-flat-list`) are excluded from handles via
`notDraggableClassName`, and blockquotes via `excludedTags` — both are
incidental configuration rather than a stated policy. Decide the intended
matrix (top-level blocks, list items, blockquote children, table as a unit)
and encode it in tests before enabling handles on nested structures.

### 6. Omni editor-command availability

Completed in PR #656. A narrow typed editor-engine availability contract now
hides unavailable heading and table commands in omni search while handlers
still revalidate at execution. The implementation also retains the
last-focused live editor across omni/external focus handoffs and covers the
multi-editor edge case without adding a generic dynamic command registry.

### 7. Intentional undo grouping

Selecting a slash item performs two transactions: delete the `/query` mark
text, then run the block command. Programmatic `+` adds a third (paragraph
insert). Decide the intended undo story (one undo step back to the pre-menu
state is the Atlaskit/tiptap convention), implement via `addToHistory` /
`appendTransaction` grouping if needed, and add e2e coverage for typed-select
undo and plus-select undo before changing anything.

### 8. Outside-click and scrollbar interaction tests

The slash menu dismisses via selection movement and Escape; outside clicks
move the selection and dismiss indirectly. Add explicit Playwright coverage:
outside click closes the menu without inserting; dragging the menu's
scrollbar (the `[cmdk-list]` mousedown exemption in `slash-command.tsx`)
neither blurs the editor nor selects an item.

## Completed since first draft

- Space terminates the slash query (`endOnWhitespace` per provider; wiki
  links keep multi-word queries) — unit + e2e covered.
- Synthetic trigger persistence: `removeSuggestMark` deletes
  synthetic-marked text on every deactivation path, and the save path
  serializes through `stripSyntheticSuggestionText`, so a "+"-opened `/`
  can never reach storage (navigate-away e2e covers the repro).
- Omni editor-command availability: PR #656 hides invalid heading/table
  actions from omni search and retains execution-time validation.

## Out of scope

- Fullwidth `／` slash trigger (separate product decision).
- Rebuilding programmatic menu opening as plugin-state-only (no document
  text): rejected as disproportionate — it forks positioning, query, and
  keymap handling into a second state model. The synthetic-mark approach
  plus serialization stripping achieves the same invariant.
- Atlaskit's typeahead state machine or custom history machinery; only its
  test invariants are worth mining.
- Yjs relative positions, async item loading/debounce infrastructure — not
  applicable while slash items are static and documents are local.
- Merging the slash menu with omni search (rejected in PR #633 discussion;
  the surfaces share `CommandMenuRow`, `slash-items.ts` data, and
  `command::editor:*` commands instead).

## Verification

Per item: banger-editor unit specs beside the source
(`packages/js-lib/banger-editor/src/__tests__/`), plus Playwright coverage in
`packages/tooling/e2e-tests/src/{block-handle,slash-command}.e2e.ts` for
user-visible behavior. `pnpm local-ci-check` before any PR. Manual smoke with
`playwright-cli` for pointer-heavy items (2, 4, 8), including a two-editor
scenario for item 1.

## Known blockers

None.

## Next steps

1. Item 1 (mapped positions) first — items 2 and 4 want the same per-view
   state container it introduces.
2. Items 3 and 4 are small and independent; good warm-ups.
3. Items 7–8 are behavior decisions; confirm the intended UX (one-line answer
   each) before implementing.
