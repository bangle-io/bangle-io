---
title: Lazy-load the editor math renderer
status: blocked
type: plan
archived: false
archived_on:
created: 2026-07-18
updated: 2026-07-24
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/637
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/197
---

# Lazy-load the editor math renderer

## Summary

Move KaTeX rendering code and styles out of the initial ProseMirror editor
bundle. Notes without math should not request KaTeX JavaScript, CSS, or fonts.
The math schema and Markdown support must remain available synchronously so
portable `$...$` and `$$` source never depends on a network or chunk-load
success to parse, edit, save, or recover.

## Current status

Blocked on upstream, verified 2026-07-24.

- Math support is complete in PR #637 and deliberately loads KaTeX eagerly.
- The recorded main JavaScript bundle grew from 564.01 kB gzip before the
  feature to about 653.25 kB gzip on the PR head. KaTeX also emits about 1.07 MB
  of font assets that browsers load on demand.
- `@benrbray/prosemirror-math` is pinned at `1.0.0` and exposes one JavaScript
  entry, which statically imports KaTeX and bundles schema, plugins, commands,
  and `MathView` together. Its `exports` map declares only `"."` and
  `"./dist/*.css"`; raw `lib/` sources ship but are not exposed, so
  deep-importing the schema without the nodeview does not resolve.
- Bangle must not fork or copy the upstream nodeview to create an artificial
  split. A true lazy boundary cannot *ship* without an upstream entry split, so
  the blocking step is an upstream issue or PR. Next steps 1 and 3 (measuring
  the module graph, prototyping the async nodeview handoff) can still proceed
  locally and would strengthen that upstream request.

## Scope

1. Record a fresh bundle-analysis baseline and identify every eager path from
   the browser editor entry to KaTeX, its stylesheet, and fonts.
2. Propose or contribute an upstream packaging boundary that keeps schema,
   state, commands, and input rules in a lightweight entry and exposes the
   KaTeX-backed nodeview from a separate renderer entry.
3. Prototype a Bangle-owned asynchronous nodeview adapter that:
   - returns a synchronous, editable raw-TeX placeholder;
   - loads the upstream renderer once when the first math node mounts or a math
     insertion command is used;
   - upgrades only if the nodeview is still alive and at the same document
     position;
   - preserves selection, IME, display-exit, paste, and bounded-render options;
   - leaves raw TeX visible and editable if the renderer chunk fails.
4. Move `katex.min.css` behind the same lazy boundary. Keep only the minimal
   structural placeholder/editing styles eager if they are required before the
   renderer loads.
5. Prefetch the renderer when a loaded note contains math so existing equations
   settle quickly, without delaying Markdown parsing or editor construction.
6. Ensure concurrent editors share the module request but retain independent
   macro state and lifecycle cleanup.

## Out of scope

- Forking, vendoring, or block-copying the upstream math package.
- Omitting math schema support from notes that initially contain no equations.
- Recreating the editor when the user inserts the first equation.
- Unloading KaTeX after it has been requested.
- Changes to the experimental editor or an editor migration.

## Verification

- Production bundle output contains a separate async math-renderer chunk and no
  KaTeX code in the initial editor chunk.
- Opening and editing a note without math makes no request for KaTeX JavaScript,
  CSS, or fonts.
- Opening a note with math and inserting the first math node each request the
  renderer at most once and preserve the current rendered/editable behavior.
- A simulated renderer-import failure keeps the original TeX visible, editable,
  copyable, and byte-stable through save and reload.
- Existing Markdown round-trip, invalid-TeX, clipboard, overflow, focus, IME,
  and persistence tests remain green.
- Add a released-workflow Playwright test for the lazy request boundary and run
  `pnpm lint:ci`, `pnpm test:ci`, `pnpm build`, relevant Playwright, and
  `pnpm local-ci-check`.
- Before release, use Playwright CLI to exercise first render, first insertion,
  chunk-failure recovery, and Browser-workspace reload persistence.

## Known blockers

- The published upstream package does not currently provide a renderer-free
  entry point. If an upstream-supported split is not available, keep the eager
  integration rather than weakening editor correctness or maintaining a fork.
- A synchronous ProseMirror nodeview must exist before the dynamic import
  resolves. The placeholder-to-renderer handoff needs a focused prototype and
  lifecycle tests before implementation is accepted.

## Next steps

1. Measure the current module graph with the repository's production Vite
   build and confirm the expected savings from isolating KaTeX.
2. Draft the smallest viable upstream export split and validate it against
   Bangle's adapter without copying upstream implementation.
3. Prototype the asynchronous nodeview handoff behind tests before changing
   production wiring or CSS loading.
