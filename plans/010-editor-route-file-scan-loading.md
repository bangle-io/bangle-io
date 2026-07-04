---
title: Editor Route File Scan Loading State
status: planned
type: plan
archived: false
archived_on:
created: 2026-07-03
updated: 2026-07-03
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

- The issue is reproducible in a large real Native FS workspace.
- A worker prototype confirmed the likely root cause and proved that a
  dedicated route-resolution state can address it.
- That prototype was intentionally not kept in the working tree because the
  state model and UI semantics need careful review before implementation.

## Scope

- Add an explicit workspace file scan state in
  `packages/core/service-core/src/workspace-state-service.ts`.
- Add a derived current-route file resolution atom, likely shaped like:
  `none | loading | found | missing | error`.
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

1. Add a private workspace scan atom in `WorkspaceStateService`, for example:
   `idle`, `loading`, `ready`, and `error`, with `wsName` on non-idle states.
2. Replace the `wrapPromiseInAppErrorHandler(..., EMPTY_STRING_ARRAY, ...)`
   scan path with explicit success/error handling so errors can be represented
   separately from an empty workspace.
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
