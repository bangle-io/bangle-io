---
title: Hover-expandable heading TOC rail
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-13
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/642
related_issues: []
---

# Hover-Expandable Heading TOC Rail

## Summary

Add a Notion-style table-of-contents rail to the note editor page. Collapsed,
it is a quiet vertical stack of small horizontal dashes anchored at the
right-center of the content area — one dash per heading, indented by heading
level, with the dash for the currently visible section highlighted. Hovering
(or keyboard-focusing) the rail expands it into a panel listing the heading
texts; clicking an entry smooth-scrolls the document to that heading. The rail
renders only when the document has enough meaningful headings to be worth
navigating.

## Current status

Planned. No implementation yet. Codebase reconnaissance done; the active
editor engine is ProseMirror (`packages/core/editor` /
`@bangle.io/banger-editor`); wordgard (`editor-w`) is URL-flag gated and its
heading APIs are stubs, so this plan targets the ProseMirror stack with a
seam that wordgard can adopt later.

Verified against `main` 2026-08-01.

## UX behavior

- **Collapsed rail**: fixed at the vertical center of the editor viewport,
  hugging the right edge of the page content region (matching Notion's
  placement). Each heading renders as a
  short rounded bar; bar width/indent encodes heading level (h1 widest, h2/h3
  progressively shorter and inset). Muted color; the bar for the heading
  section currently at the top of the viewport uses the foreground/accent
  color. Subtle opacity ramp-in on mount; respects `prefers-reduced-motion`.
- **Expanded panel**: on `pointerenter` (with a small open delay, ~150ms) or
  keyboard focus, the dashes cross-fade into a popover panel listing heading
  texts, indented by level, active entry highlighted, long titles truncated
  with a title attribute. The panel opens leftward (into the content area)
  from the rail. Panel is scrollable (`max-h` + `overflow-y-auto`)
  for long documents. Closes on `pointerleave` (small close delay so the
  cursor can travel from rail to panel) and on `Escape`.
- **Click**: smooth-scrolls the heading to the top of the viewport. It does
  **not** move the editor selection/cursor and does not steal focus — the
  panel `preventDefault`s `mousedown` like the other editor overlays, so an
  actively-editing user keeps their caret where it was.
- **Visibility rules**: rendered only when the open document has ≥ 2
  headings with non-empty text (constant `MIN_TOC_HEADINGS = 2`). Hidden on
  small screens (below `md`), during editor loading/error states, and on
  non-editor pages. Cap rendered entries (e.g. 100) for pathological docs.
- **Keyboard/a11y**: rail is a focusable `nav` with `aria-label` from
  translations; expanded entries are buttons reachable by Tab/arrow keys;
  Enter activates. Expansion also triggers on focus-within so keyboard users
  get the panel without a pointer.

## Architecture

### 1. Heading data: ProseMirror plugin → jotai atom

Follow the `link-menu` idiom (plugin publishes derived state to a view-keyed
atom; React reads it with `useAtomValue`). `link-menu` is the minimal form —
internal atom plus read-only public atom, a copy-on-write `setXForView` that
deletes the key on `undefined`, cleanup in `destroy`. `$suggestions` is the
same shape with an extra by-mark inner map a TOC does not need.

- New plugin `headingWatch` (name TBD) in `@bangle.io/banger-editor` (js-lib
  layer), re-exported through the `@bangle.io/prosemirror-plugins` barrel.
  That barrel is almost entirely re-exports of `banger-editor`, and
  `core/editor` imports PM code through it rather than directly. On `docChanged` transactions it walks
  `doc.descendants`, collecting `{ pos, level, text }` for nodes of type
  `heading` (same walk `PmEditorService.navigateToHeading` already does).
  Publishes to a `$headings: Map<EditorView, HeadingItem[]>` atom, with a
  shallow-equality check so unchanged heading sets do not re-render React,
  and debounced (~250ms trailing) so typing inside a heading doesn't churn.
- Cleanup on view destroy removes the map entry, mirroring the suggestions
  plugin lifecycle.
- Because the data flows through an atom rather than a PM-specific hook, a
  future wordgard implementation only needs to publish to the same atom shape
  to light the rail up; no contract change is required now. Do not extend
  `EditorEngineContract` speculatively.

### 2. React component: `HeadingTocRail`

- New file `packages/core/editor/src/components/heading-toc-rail.tsx`
  (kebab-case), mounted as a sibling overlay inside the `relative` wrapper in
  `packages/core/editor/src/index.tsx`, taking the same `editorName` prop as
  `SlashCommand`/`LinkMenu` and resolving the view via
  `useEditorCoreServices().editorEngine.getEditor(editorName)`.
- Reads `useAtomValue($headings)` and picks the entry for its view. Returns
  `null` under the visibility rules above.
- Positioning: the editor page scrolls the **window**, not a nested container
  — neither `SidebarInset` nor `PageContentContainer` sets `overflow`. So
  `sticky` has no scrolling ancestor to stick to. Anchor vertically to the
  viewport and horizontally to the content column: `top: 50%` with
  `translateY(-50%)`, right edge measured against `PageContentContainer`,
  whose width flips between centered and full-bleed via `$wideEditor`. Fall
  back to `useFloatingPosition` + `@floating-ui/dom` `autoUpdate` if manual
  measurement proves fragile.
- Expanded panel renders adjacent to the rail (opens leftward). Reuse
  `FLOATING_INITIAL_STYLE` z-index conventions and `bg-popover
  text-popover-foreground ring-foreground/10` styling to match existing
  editor popovers. `B-editor-toc-rail` class prefix for the container.

### 3. Active-section tracking

- On scroll find the last heading whose DOM element
  (`editorView.domAtPos(pos)`) sits above a viewport threshold (~1/3 height).
  Store as local state; drives both dash and panel highlight.
  IntersectionObserver is an alternative, but heading positions shift as the
  doc edits, so a cheap rAF scan over ≤100 cached rects re-derived on
  `$headings` change is simpler and adequate.
- Reuse `setupScrollAndResizeHandlers` from `banger-editor`'s
  `pm-utils/position` — it is the existing rAF-throttled `window`
  scroll/resize helper. Skip zero-sized rects: headings inside a collapsed
  section stay mounted under `display: none` and report all-zero rects, which
  would otherwise poison the scan.

### 4. Scroll-to-heading

- `editorView.domAtPos(pos)` → nearest heading element →
  `scrollIntoView({ behavior: 'smooth', block: 'start' })`
  (instant when `prefers-reduced-motion`). No transaction dispatch, no
  selection change. Note this intentionally differs from
  `PmEditorService.navigateToHeading` (URL-fragment navigation), which does
  set the selection.

### 5. Translations

- New keys under `t.app.editor.toc.*` in
  `packages/shared/translations/src/languages/en.ts`: rail aria-label,
  panel heading (if any), and "jump to {heading}" affordance text.

## Design considerations / known risks

- **Right-edge overlaps**: in wide-editor mode text runs close to the right
  edge, so the collapsed rail must stay slim (≤ 12px of dashes plus a wider
  invisible hover hit-area) with a small inset. The left-gutter block/drag
  handle from plan 014 is a non-issue on this side. `LinkedMentions` renders
  below the editor in the same window scroll flow, so a viewport-centered
  rail can overlap it on short notes. Validate visually in M2 in wide and
  centered modes, sidebar open and closed, and on a short note.
- **Collapsed heading sections**: folded sections stay mounted under
  `display: none` node decorations, so a TOC target inside one has a live
  element that cannot be scrolled to. Expand ancestors before scrolling
  (matches user intent) using `query.listCollapsedHeadings` +
  `getHeadingFoldRange` for the containment check and
  `command.toggleHeadingCollapseAtPos` to open them. Note this dispatches a
  transaction, which conflicts with the no-dispatch rule in §4 — resolve that
  tension explicitly in M3.
- **Focus discipline**: per the established rule for editor popups, the
  panel must never steal focus from the editor — `preventDefault` on
  `mousedown` for every interactive element.
- **Multiple editors**: `$headings` is keyed by view, and each `Editor`
  mounts its own rail, so split/secondary editors (if ever enabled) stay
  independent.

## Scope

- Heading-watch plugin + `$headings` atom in `@bangle.io/banger-editor`,
  re-exported through the `@bangle.io/prosemirror-plugins` barrel.
- `HeadingTocRail` component (collapsed rail, hover/focus expansion, click
  to scroll, active tracking) mounted in the ProseMirror editor.
- Visibility rules, translations, reduced-motion support, a11y pass.
- Unit + Playwright coverage (below).

## Out of scope

- Wordgard/editor-w implementation (stubbed engine; atom seam left ready).
- Persisting expansion state, pinning the panel open, or a full sidebar
  outline view.
- TOC for the live markdown source editor (plan 013).
- Mobile/touch affordance (rail hidden below `md`).

## Milestones

1. **M1 — heading data**: plugin + `$headings` atom + debounce/equality;
   Vitest specs covering extraction, empty-text filtering, updates on edit,
   and cleanup on destroy.
2. **M2 — collapsed rail**: component, positioning against the real scroll
   container, visibility rules, level-indent dash rendering; verify wide vs
   centered editor and sidebar open/closed with `playwright-cli`.
3. **M3 — expansion + navigation**: hover/focus panel, click-to-scroll,
   active-section tracking, collapsed-section handling, focus discipline.
4. **M4 — polish + tests**: animations/reduced-motion, dark mode, a11y
   audit, translations, e2e suite, plan status update.

## Verification

- `pnpm lint:ci` and `pnpm test:ci` green.
- New Vitest specs for the plugin (real editor setup via test-utils, no
  mocks of PM internals).
- New `packages/tooling/e2e-tests/src/heading-toc-rail.e2e.ts` (model on
  `block-handle.e2e.ts` / `collapsible-headings.e2e.ts`):
  - note with 3 headings → rail visible with 3 dashes; hover → panel shows
    heading texts; click last entry → that heading scrolled into view and
    entry marked active.
  - note with 0–1 headings → rail absent.
  - editing: adding a heading updates the rail without reload; reload keeps
    the rail populated (persistence path).
  - clicking an entry while the caret is in the editor does not move the
    caret or blur the editor.
- Manual `playwright-cli` smoke across wide/centered editor and dark mode
  before release, per repo release rules.

## Known blockers

None.

## Next steps

- Implement M1 (plugin + atom + specs) on a feature branch.
