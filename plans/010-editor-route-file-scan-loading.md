---
title: Editor Route File Scan Loading State
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-03
updated: 2026-07-24
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/587
related_issues: []
---

# Editor Route File Scan Loading State

## Summary

Opening an existing note in a large Native FS workspace can briefly render
`Note Not Found` before the workspace file scan completes. The current editor
route treats "the routed file is not currently in `$rawWsPaths`" as a final
missing-note result, but `$rawWsPaths` starts empty and is populated
asynchronously by `fileSystem.listWorkspaceFiles()`.

The fix should make file-existence resolution explicit: pending scans should
produce a neutral loading state, completed scans without the route should
produce a real missing-note state, and scan failures should never masquerade as
a missing note.

## Current Status

Verified against `main` 2026-07-24: bug still present, and smaller than this
plan assumed — the error half already landed, only the pending half remains.

- The issue is reproducible in a large real Native FS workspace.
- A worker prototype confirmed the likely root cause and proved that a
  dedicated route-resolution state can address it.
- That prototype was intentionally not kept in the working tree because the
  state model and UI semantics need careful review before implementation.
- `$fileTreeListState` (`ok | native-fs-directory-not-found | error`) now
  exists but has no pending member and initializes to `ok`, so before the
  first scan the app asserts the listing is fine while `$rawWsPaths` is empty.
- `page-editor.tsx` renders `NoteNotFoundView` from the final `else` of its
  three-way ternary, consulting neither a loading state nor
  `$fileTreeListState`. A *first* scan that fails therefore shows "Note Not
  Found"; a failed rescan does not, because `$rawWsPaths` is preserved for the
  same workspace. The `native-fs-directory-not-found` variant never reaches
  `PageEditor` at all — `app/src/index.tsx` preempts it with
  `PageNativeFsRecovery` — and `app-sidebar.tsx` handles only plain `error`.
- **The `WorkspaceNotFoundView` branch has the same premature-verdict bug, and
  it fires first.** `!currentWsName` renders workspace-not-found, but
  `$currentWsName` derives from `$workspaceListState`, which *already* has a
  `loading` member that `PageEditor` ignores. So on a cold load the first false
  verdict is "Workspace Not Found", not "Note Not Found". Fixing only the file
  scan leaves the earlier flash in place — this belongs in Scope.
- There are no `PageEditor` unit tests. Note that
  `e2e-tests/src/delete-note-dialog.e2e.ts` asserts the `Note Not Found`
  heading twice, including after a reload, so it is pinned to the exact branch
  steps 6-7 replace and will need updating.

## Scope

- Add an explicit workspace file scan state in
  `packages/core/service-core/src/workspace-state-service.ts`.
- Add a derived current-route file resolution atom, likely shaped like:
  `none | loading | found | missing | error`.
- Make `PageEditor` respect `$workspaceListState`'s existing `loading` status
  so the workspace-not-found branch stops firing before the list resolves.
- Keep the existing `$currentWsPath` API as the "found file only" compatibility
  surface so existing note-only callers do not accidentally start acting on
  unresolved routes.
- Update `PageEditor` to render:
  - editor when the route file is found;
  - workspace-not-found when the workspace itself is absent;
  - neutral loading while the route file is unresolved because listing is
    pending;
  - a non-destructive scan-error state when listing fails;
  - `NoteNotFoundView` only after a completed scan proves the note is absent.
- Add user-visible strings through `packages/shared/translations`.

## Out Of Scope

- Replacing the workspace scan/indexing architecture.
- Caching a persistent workspace index.
- Changing editor load/read semantics once a note path is resolved.
- Changing asset page routing behavior.
- Fixing the existing nested `<p>` warning in not-found notice views.

## Design Notes

- The scan state should be keyed by `wsName`. A ready scan for one workspace
  must not let a route in a different workspace resolve as missing.
- Starting a new scan should mark the active workspace as `loading` without
  clearing useful previous paths prematurely. If the routed file is already
  known in the current workspace, `$currentWsPath` can remain found while the
  refresh runs.
- Stale scan completions must be ignored by `AbortSignal` and/or matching the
  scan's `wsName`.
- Scan errors should emit the app error and expose an error resolution. Do not
  turn listing failure into an empty file list that renders false
  `Note Not Found`.
- Keep command handlers and note-only surfaces on `$currentWsPath` unless they
  explicitly need unresolved-route information.

## Implementation Steps

1. Add a `wsName`-keyed scan state to `WorkspaceStateService`: `idle`,
   `loading`, `ready`, `error`. Prefer extending `$fileTreeListState` with a
   pending member over a parallel atom, but note `app/src/index.tsx` and
   `app-sidebar.tsx` both read it and each need a branch. The only current
   workspace keying is `lastListedWsName`, a mutable field no atom can read.
   `WorkspaceListState` is the in-repo precedent for the shape.
2. ~~Replace the `wrapPromiseInAppErrorHandler` scan path with explicit
   success/error handling.~~ Done: the scan uses explicit success/error
   callbacks and a failed rescan preserves the last known tree.
3. Add a public `$currentWsPathResolution` atom:
   - `none` when there is no editor file route;
   - `found` when the route wsPath is present in `$rawWsPaths`;
   - `loading` when the current workspace scan is idle/loading or belongs to a
     different workspace;
   - `missing` only when the current workspace scan is ready and the route
     wsPath is absent;
   - `error` when the current workspace scan failed.
4. Derive `$currentWsPath` from `$currentWsPathResolution.status === 'found'`.
5. Update `resolveAtoms()` to include the new resolution only if tests or
   command handlers need it.
6. Update `PageEditor` to render a small neutral loading view for `loading`.
   Use a concise status string such as `Loading note...`.
7. Add a scan-error view or reuse an existing non-destructive error surface for
   `error`; avoid `NoteNotFoundView` for errors.
8. Keep the header/sidebar behavior unchanged unless review finds that the
   unresolved editor route needs breadcrumb visibility during loading.

## Verification

Unit tests:

- `WorkspaceStateService` returns `loading` for an editor route while the first
  workspace scan promise is blocked.
- The same route transitions to `found` when the blocked scan resolves with the
  route wsPath.
- A missing route transitions from `loading` to `missing` only after the scan
  resolves without that wsPath.
- A scan error transitions to `error` and does not clear into a false empty
  ready state.
- Switching workspaces treats the old workspace's ready file list as stale for
  the new route.

UI tests:

- `PageEditor` does not render `Note Not Found` while the route resolution is
  `loading`.
- `PageEditor` renders `NoteNotFoundView` after `missing`.
- `PageEditor` renders the selected error/loading copy through translations.

Playwright/manual coverage:

- Add a deterministic Playwright workflow if practical. The test should open an
  editor route while workspace listing is intentionally delayed and assert that
  `Note Not Found` never appears before the editor or final missing state.
- Manually smoke a large Native FS workspace with Playwright CLI against
  `localhost:5175`: open an existing nested note, observe no transient
  not-found view, reload, and verify the note still loads.

Required repo gates before merging:

- `pnpm lint:ci`
- `pnpm test:ci`
- Focused Playwright while iterating
- `pnpm e2e:ci` before PR readiness
- `pnpm local-ci-check` before updating/pushing the PR

## Known Blockers

- Deterministic E2E coverage may need a test-only way to delay workspace file
  listing. Avoid production-only timing assumptions or arbitrary sleeps.
- The error-state UI needs product review: loading is straightforward, but a
  scan failure should have clear recovery copy without implying the note is
  gone.

## Next Steps

1. Review the proposed scan-resolution API shape before coding.
2. Implement the service state first with unit tests.
3. Wire `PageEditor` after the service contract is stable.
4. Add UI and Playwright coverage.
5. Manually verify with a large Native FS workspace through Playwright CLI.
