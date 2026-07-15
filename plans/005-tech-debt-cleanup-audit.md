---
title: Tech Debt Cleanup Audit
status: active
type: plan
archived: false
archived_on:
created: 2026-06-15
updated: 2026-07-14
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/631
  - https://github.com/bangle-io/bangle-io/pull/647
  - https://github.com/bangle-io/bangle-io/pull/632
  - https://github.com/bangle-io/bangle-io/pull/635
  - https://github.com/bangle-io/bangle-io/pull/636
  - https://github.com/bangle-io/bangle-io/pull/638
  - https://github.com/bangle-io/bangle-io/pull/639
  - https://github.com/bangle-io/bangle-io/pull/641
  - https://github.com/bangle-io/bangle-io/pull/645
  - https://github.com/bangle-io/bangle-io/pull/646
related_issues: []
---

# Tech Debt Cleanup Audit

## Summary

This plan consolidates a multi-agent audit of the repository into a sequenced
cleanup roadmap. The audit focused on Bangle.io priorities: protect user data,
preserve Markdown fidelity, keep local-first behavior predictable, and maintain
clear workspace boundaries.

The most urgent remaining cleanup area is failure-state continuity across
service lifetimes. Save serialization/coalescing and last-good workspace-list
retention have landed, but the module-global save store can retain tasks from a
disposed service graph, and command/dialog workflows can still detach
asynchronous completion. Those items should land before broader UI or tooling
cleanup.

## Current Status

- Audit completed across architecture/package boundaries, editor and storage
  safety, React UI/state, and tooling/test hygiene.
- A 2026-07-12 core/app containment re-audit is recorded below with a verified
  open/resolved matrix. PR #631 closed the schema-bound Markdown parser bug,
  cache-key collision, memory-storage contract bugs, workspace-list mutation,
  one Native FS handler promise, and two dead services. PR #632 removes five
  orphan routes and hardens Settings return-link validation. The remaining
  correctness and boundary work is explicitly retained in this plan.
- P0.1 started with an editor-owned per-`wsPath` save queue that serializes
  writes, coalesces rapid edits to the latest pending document, exposes
  `clean`, `pending`, and `failed` save states, and emits app errors when the
  latest save fails. Failed latest saves retain the unsaved document in memory
  for explicit retry, and `PmEditorService` exposes save status/dirty APIs and
  change subscriptions. Pending or failed saves now activate browser
  navigation/reload protection, failed saves show a persistent translated retry
  action, and a successful retry clears protection. Store ownership across UI
  reload/service-graph replacement remains C4 below.
- P0.2 started with explicit editor load rejection handling that emits an app
  error instead of leaving the mount promise silently pending. Failed load
  status and a same-node retry API are now exposed. Parse-failure isolation and
  the user-facing recovery view remain.
- 2026-07-07 re-audit and cleanup pass:
  - P0.3 verified complete on main: ws command handlers await storage
    mutations before navigating, keep routes stable on failure, and
    `ws-command-handlers.spec.ts` covers the ordering.
  - P0.4 safe ordering landed: baby-fs rename now verifies the destination
    bytes before deleting the source and throws
    `RENAME_VERIFICATION_FAILED_ERROR` with cause; failure-point tests cover
    both backends. Journaled pending-move records and startup recovery remain
    follow-up.
  - P0.5 done for file-tree listing: `WorkspaceStateService` preserves the last
    known file tree on same-workspace list failures, exposes
    `$fileTreeListState`, and the sidebar shows a retry notice backed by
    `command::ws:refresh-file-tree`. This does not cover `$workspaces` metadata
    refresh failures; that remains C1 in the 2026-07-12 matrix.
  - P1.1 partially superseded: the shared golden corpus
    (`test-utils/markdown-corpus.ts`) plus a load-time round-trip fidelity
    gate in `PmEditorService` (warns when a note cannot round-trip; opening
    never writes back) landed. Per-construct parity decisions live in plan
    012.
  - P2.1 and P2.2 verified already resolved on main: `@bangle.io/types` no
    longer imports core services and no package-private `src` imports remain.
  - P2.3 improved mechanically: storage services now reach
    `FileSystemService` via a config thunk resolved inside `instantiate()` and
    asserted before use. The 2026-07-12 re-audit reopens the Native FS half as
    A3 because its platform root-handle provider still calls upward into
    `WorkspaceOpsService` through a late-bound closure.
  - P3.1 verified already resolved: no duplicate component trees remain.
  - P3.2 done for render paths: remaining render-time `resolveAtoms()` reads
    replaced with `useAtomValue` subscriptions.
  - P3.5 done for app-level decomposition: sidebar file-tree actions moved to
    `useSidebarFileActions`, the footer menu moved to `SidebarFooterMenu`, and
    core `AppSidebar` is a thin composition layer. Moving the one-caller,
    Bangle-specific 582-line UI composition out of `ui-components` remains A6.
  - P4.1 done: GitHub Actions runs `pnpm run build`.
  - P4.5 partially done: `noFloatingPromises` is now a Biome error repo-wide;
    `noExplicitAny` (163 sites) and `noUnusedVariables` remain warnings.
- 2026-07-12 high-ROI cleanup batch:
  - A10 done: production editor setup no longer enables global debug mode,
    installs the schema/editor view on `window`, or ships the console-only
    document inspection helpers. E2E assertions now observe DOM selection and
    navigation rather than the private editor global.
  - P4.2 done: the external Playwright sample was deleted, E2E and component
    reports/results use separate package-local directories, and CI uploads
    those actual artifact paths.
  - A4 improved: `WorkbenchStateService` no longer declares or receives its
    unused database dependency.
  - P3.3 improved: `StarButton` now follows the application convention of using
    the global `t` object instead of importing translations directly. The
    broader literal-string sweep remains open.
- 2026-07-12 obsolete service API cleanup (PR #636):
  - A4 improved: removed the zero-consumer command object-to-key cache/getter,
    core navigation `fromUri` pass-through, workspace misc-data methods, and
    their unreachable app-error variant. The generic database misc table stays
    intact so this cleanup does not alter persisted storage schemas.
- 2026-07-12 workspace dialog correctness and accessibility cleanup:
  - C5 done: workspace creation now awaits the durable callback, blocks repeat
    submission and dismissal while pending, keeps the dialog open on failure,
    and restores an in-dialog retry path. Component coverage proves a
    double-click starts one attempt, while app E2E covers a real duplicate
    workspace rejection.
  - P3.4 improved: the sidebar search affordance is now a semantic button with
    native Enter/Space behavior instead of a `div role="button"` wrapped around
    a read-only input. App E2E exercises the Space-key path.
- 2026-07-12 IndexedDB error and type hygiene cleanup:
  - P5.3 done: the remaining IndexedDB adapter now retains the original
    rejection as `Error.cause` for both generic upstream errors and translated
    constraint failures. The replacement Native FS library already preserves
    causes when it normalizes browser errors; the legacy Native Browser FS
    evidence was removed with that adapter.
  - P5.1 improved: foundational `BaseError` stack capture no longer relies on
    `any` or the obsolete `__proto__` fallback, and the touched IndexedDB slice
    no longer carries an unsafe array guard, a parameter-assignment lint
    suppression, or dead untyped test helpers.
- 2026-07-13 workspace refresh continuity cleanup:
  - C1 done: `WorkspaceStateService` now exposes an explicit
    `$workspaceListState` resource with `loading`, `ready`, and `error` states.
    Every state carries the last successful workspace data, so a failed
    metadata refresh no longer hides the active workspace or clears
    workspace-driven UI.
  - Focused real-service coverage forces a database failure after a successful
    load, verifies the prior array and current workspace remain available, and
    proves a later refresh returns the resource to `ready`.
- 2026-07-13 cross-context lifecycle and type-hygiene cleanup:
  - P5.4 done: `TypedBroadcastBus` now closes immediately for an already-aborted
    owner, ignores already-aborted subscriptions, and makes sends after disposal
    a consistent no-op across native and memory channels.
  - The in-memory channel now structured-clones a payload independently for
    each recipient, matching the isolation of the browser channel instead of
    sharing mutable references between services and tests. Its public type now
    describes the small channel contract it actually implements rather than
    carrying throwing `BroadcastChannel` stubs.
  - P5.1 improved: `Logger` now accepts the four-method console surface it uses,
    and its message boundary uses `unknown[]` instead of five `any[]`
    signatures. Browser-bus tests no longer need an unsafe logger cast.
- 2026-07-13 foundational utility type and lifecycle cleanup (PR #646):
  - P5.1 improved: mini validators now accept `unknown` at their public
    boundary, weak caches require object keys, and command validator inspection
    uses `Validator<unknown>`.
  - P5.4 improved: generic emitter subscriptions now ignore already-aborted
    signals, detach their abort listeners during cleanup, and make destruction
    idempotent. The two-key weak cache now retains cached `undefined` results
    instead of recomputing them.
  - P4.5 re-audit: a package-wide `noExplicitAny` ratchet was trialled but not
    kept because removing type-level wildcards from the generic emitter
    required conditional types and a double assertion without rejecting more
    invalid caller behavior. The stale browser-entry `eslint` script and the
    original command-dialog/radio-control accessibility findings were verified
    already resolved on `main` and are reconciled below.
- 2026-07-14 storage-contract and translation hygiene cleanup (batch 3, PR
  #647):
  - P3.3 done: every Omni Search heading, action, empty state, placeholder, and
    accessible dialog title now uses the global translation object. English
    and German carry the complete eight-message surface, and locale E2E opens
    the German command bar and verifies translated user-visible behavior.
  - P5.1 improved: `BaseFileStorageProvider` no longer advertises six
    zero-consumer metadata, capability, and search members. The three concrete
    storage providers no longer carry the corresponding dead labels or
    support-probe methods. The follow-up removes the unused `sha` create/write
    option path and narrows provider workspace types to the existing typed
    storage union.
  - P4.2 improved: the shared create-workspace/note E2E helper now waits for
    the exact new editor identity instead of any visible editor, preventing
    follow-up typing and shortcuts from racing a stale view. The date picker
    also makes its initial single-day selection required so selecting today
    commits instead of toggling to an empty selection in UTC CI.
  - The full open-item re-audit kept C3/C4, P0.4, and Native FS work out of this
    batch because PR #640 owns relocation/save-queue changes, PR #644 owns the
    Native FS settings command, PR #626 owns external sync, and the existing
    service-architecture and Knip worktrees cover broader boundary/dead-code
    changes. C6, C8, P1.3, P4.4, and P5.2 are narrowed below to match current
    code instead of retaining stale claims.
- Findings are grouped by priority and theme below.

## Scope

- Core editor save reliability and Markdown fidelity.
- Local-first file-system correctness and recovery behavior.
- Workspace dependency hierarchy and package public APIs.
- React/Jotai state cleanup and component consolidation.
- Translation, accessibility, and UI consistency debt.
- CI, test, lint, and workspace-validation hardening.

## Out Of Scope

- Feature work not directly tied to cleanup or reliability.
- Production deployment.
- Dependency upgrades except where they support validation or CI cleanup.
- Large visual redesigns.

## Priority 0: Data Safety And Local-First Correctness

### P0.1 Add Reliable Editor Save Pipeline

Problem:

- Editor writes are started from `PmEditorService` without awaiting, catching,
  retrying, or surfacing errors.
- `createEditor` serializes Markdown on every document change, so rapid edits
  can start overlapping storage writes.
- A slower earlier write can finish after a newer write and overwrite the latest
  content.

Evidence:

- `packages/core/editor/src/pm-editor-service.ts`
- `packages/core/editor/src/pm-setup.ts`

Plan:

- [x] Introduce a per-`wsPath` save queue owned by editor or service-core.
- [x] Debounce or coalesce rapid document changes before writing.
- Track monotonically increasing save revisions and ignore stale completions.
- [x] Surface save states: clean, pending, failed.
- [x] Retain the latest failed save body for explicit retry.
- Surface retrying save state if/when automatic retry is added.
- [x] Route failures through the app error system and keep a persistent unsaved
  state until the write succeeds or the user chooses a recovery action.
- [x] Expose a service API that navigation/reload protection can query for
  pending or failed writes.
- [x] Add navigation/reload protection UI wiring when a note has pending or
  failed writes.
- [x] Show a persistent translated failed-save recovery action that retries the
  retained latest body.

Verification:

- [x] Unit test ordered save completion with intentionally delayed writes.
- [x] Unit test rejected writes produce an app error and do not clear dirty
  state.
- [x] Unit test latest failed save retry writes the retained unsaved body.
- [x] Unit/integration test save-status subscriptions activate protection once
  and clear it after save or successful retry.
- [x] Playwright CLI verified successful edit navigation/reload persistence,
  forced-write-failure dirty state and retry UI, protected reload and full-page
  navigation, retained-body persistence after retry, and protection clearing
  after retry.

### P0.2 Handle Editor Load And Parse Failures

Problem:

- Initial `readFileAsText(...).then(...)` has no rejection handling at editor
  mount.
- Markdown parse failures are not isolated behind a recovery view.
- A malformed or unsupported note can leave the editor in a pending or broken
  state.

Evidence:

- `packages/core/editor/src/pm-editor-service.ts`
- `packages/core/editor/src/pm-setup.ts`

Plan:

- [x] Catch initial read failures, store failed load state, and emit a note-load
  app error.
- [x] Expose a same-node load retry API.
- Show a note-load error state.
- Catch Markdown parse failures separately from storage failures.
- Offer recovery actions that preserve raw content, such as opening raw
  Markdown, copying raw text, or downloading the file before normalization.
- Ensure failed loads do not write empty or normalized content back to disk.

Verification:

- Unit test read failure and parse failure paths.
- E2E test a malformed Markdown note opens a recovery view and does not mutate
  storage.

### P0.3 Await Command Storage Mutations Before Navigation

Problem:

- Some command handlers navigate before storage mutations complete.
- Several command paths drop asynchronous failures with unawaited promises.
- Failed create/delete/rename operations can leave navigation pointing at the
  wrong route or hide a failure from the user.

Evidence:

- `packages/core/command-handlers/src/ws-command-handlers.ts`

Plan:

- Convert create/delete/rename/move command handlers to `async`.
- Await storage mutations before navigating.
- Route rejected mutations through command failure handling.
- Keep the current route stable when a destructive operation fails.
- Add tests for failure ordering: navigation should only happen after durable
  success.

Verification:

- Unit tests in `packages/core/command-handlers/src/__tests__`.
- E2E smoke for create, rename, move, delete, and reload.

### P0.4 Make Rename/Move Recoverable

Problem:

- IndexedDB and Native FS rename are implemented as copy-then-delete.
- A crash, permission loss, quota failure, or partial write can leave duplicate
  files or incomplete moves.

Evidence:

- `packages/js-lib/baby-fs/indexed-db-fs.ts`
- `packages/js-lib/baby-fs/native-browser-fs.ts`

Plan:

- Model rename as a journaled operation with old path, new path, and phase.
- Verify the destination write before deleting the source.
- Record pending moves where the backend supports it.
- On startup or workspace load, detect incomplete move records and offer or run
  recovery.
- Keep backend-specific implementations isolated behind a common contract.

Verification:

- Unit tests for failures before destination write, after destination write, and
  before source delete.
- Storage adapter tests confirm no content loss in partial failure cases.

### P0.5 Preserve File Tree On Transient List Failures

Problem:

- Workspace file tree refresh falls back to an empty path list when list fails.
- A transient storage or permission failure can make notes appear missing.

Evidence:

- `packages/core/service-core/src/workspace-state-service.ts`

Plan:

- Preserve the last known file tree on list failures.
- Add a separate file-tree error atom/state.
- Render a recoverable error state instead of empty workspace state.
- Keep `Note Not Found` reserved for confirmed absence, not load failure.

Verification:

- Unit test list failure preserves previous paths.
- E2E test reload during transient storage failure does not show destructive or
  misleading empty state.

## Priority 1: Markdown Fidelity

### P1.1 Add Golden Markdown Round-Trip Fixtures

Problem:

- Markdown is parsed into ProseMirror and serialized back after edits.
- There is no clear raw-preservation layer for frontmatter, raw HTML, tables,
  unknown directives, or unsupported constructs.

Evidence:

- `packages/core/editor/src/pm-setup.ts`
- `packages/js-lib/banger-editor/src/*`

Plan:

- Add fixture-based round-trip tests for supported Markdown:
  - headings, paragraphs, emphasis, links, images
  - fenced code blocks and inline code
  - ordered, unordered, nested, and task lists
  - blockquotes and horizontal rules
- Add explicit lossy-fixture tests for unsupported Markdown:
  - frontmatter
  - raw HTML
  - tables
  - unknown directives or custom containers
- Decide per unsupported construct whether to preserve raw content, warn before
  editing, or intentionally normalize.

Verification:

- Vitest fixtures at the Markdown adapter level.
- At least one editor persistence integration test proving reload retains exact
  Markdown for supported constructs.

### P1.2 Resolve Underline Markdown Semantics

Problem:

- Underline is serialized as italic, which silently changes user intent.

Evidence:

- `packages/js-lib/banger-editor/src/underline.ts`

Plan:

- Choose one policy:
  - remove underline from Markdown-backed notes,
  - serialize underline as HTML `<u>` if raw HTML is supported,
  - or warn that underline is lossy and becomes italic.
- Add tests for whichever policy is chosen.

Verification:

- Markdown serialization test for underline.
- UI/editor command test if underline remains available.

### P1.3 Harden List And Task-List Parsing

Current status:

- The shared golden corpus now covers unchecked, checked, uppercase, nested,
  mixed, linked, marked-up, and empty task items for both editor engines.
- ProseMirror explicitly ignores wrapper `bullet_list`/`ordered_list` tokens
  and derives flat list items from the configured kind/checked attributes.
- Nested content under an ordered parent still has a documented indentation
  fidelity gap and is deliberately excluded from the passing corpus. That is
  the remaining correctness item; the original general task-list coverage gap
  is resolved.

Evidence:

- `packages/js-lib/banger-editor/src/list.ts`

Plan:

- [x] Add tests for `- [ ]`, `- [x]`, nested task/bullet lists, and mixed
  task/plain lists.
- [x] Derive task-list state from standard Markdown tokens or configure the parser
  explicitly to emit the required attrs.
- [x] Document task-list normalization rules in tests.
- Fix or intentionally normalize nested list indentation under ordered parents,
  then add that case to the golden corpus.

Verification:

- Golden Markdown list fixtures pass parse/serialize round trips.

## Priority 2: Architecture And Package Boundaries

### P2.1 Split Shared Types Away From Core Implementations

Problem:

- `@bangle.io/types` is in the shared layer but imports concrete core/editor
  services.
- The validator has a broad exemption allowing shared types to import anything.

Evidence:

- `packages/shared/types/src/services.ts`
- `packages/shared/types/src/services-setup.ts`
- `packages/tooling/custom-scripts/scripts/validate-all.ts`

Plan:

- Move core-specific service aggregation types to a core package.
- Keep `@bangle.io/types` limited to stable cross-layer contracts.
- Replace the broad validator exemption with a narrow allowlist for true
  type-only exceptions.
- Add a validation check that fails if shared imports core/platform/ui.

Verification:

- `pnpm run custom-validation`
- Typecheck across packages.

### P2.2 Ban Package-Private `src` Imports Across Package Boundaries

Problem:

- Several packages import `@bangle.io/*/src/...`, bypassing public APIs.
- This weakens package ownership and makes refactors harder.

Evidence:

- `packages/tooling/test-utils/test-service-setup.ts`
- `packages/js-lib/prosemirror-plugins/src/index.ts`
- `packages/core/app/src/layout/app-sidebar.tsx`
- `packages/core/app/src/components/*`
- `packages/tooling/e2e-tests/src/component-tests/*`

Plan:

- Add public exports or explicit subpath exports for required APIs and assets.
- Export the Bangle icon through `@bangle.io/ui-components` or wrap it in a UI
  component.
- Split `@bangle.io/service-platform` public entrypoints for browser, memory,
  test, and router implementations if a single barrel pulls browser-only deps.
- Add custom validation that rejects `@bangle.io/*/src` imports outside the
  package itself.

Verification:

- `pnpm run custom-validation`
- `rg -n "from ['\"]@bangle\\.io/.*/src" packages`

### P2.3 Remove Post-Construction Service Wiring

Problem:

- `FileSystemService` declares no DI deps, then receives storage services and
  workspace lookup through mutable properties.

Evidence:

- `packages/core/service-core/src/file-system-service.ts`
- `packages/core/initialize-services/src/initialize-services.ts`

Plan:

- Introduce a `WorkspaceStorageResolver` contract or pass the storage registry
  and workspace lookup through constructor config.
- Remove `assertIsDefined` checks for properties that should be constructor
  requirements.
- Keep platform services below core; do not move concrete platform imports into
  shared.

Verification:

- Service initialization tests.
- Typecheck catches missing wiring.

## Priority 3: UI, State, Accessibility, And Translation Cleanup

### P3.1 Consolidate Duplicate App Components

Problem:

- Old and new component trees coexist with near-duplicate implementations.
- Breadcrumb logic and sibling-file helpers are duplicated.

Evidence:

- `packages/core/app/src/components/note-breadcrumb.tsx`
- `packages/core/app/src/components/navigation/note-breadcrumb.tsx`
- `packages/core/app/src/components/navigation/utils.ts`
- `packages/core/app/src/components/page-header.tsx`
- `packages/core/app/src/components/common/page-header.tsx`
- `packages/core/app/src/components/notice-view.tsx`
- `packages/core/app/src/components/feedback/notice-view.tsx`
- `packages/core/app/src/components/app-toolbar.tsx`

Plan:

- Confirm unused top-level duplicates with `rg`.
- Keep `common`, `feedback`, and `navigation` variants as the canonical tree.
- Move tests to utility modules where possible.
- Delete stale duplicates and update imports.

Verification:

- App unit tests.
- `rg` confirms stale component names are gone.

### P3.2 Make React State Subscription-Safe

Problem:

- Some React paths call `resolveAtoms()` imperatively, which can bypass Jotai
  subscription semantics.
- Dialog atoms store full component props and callbacks in global state.

Evidence:

- `packages/core/app/src/pages/page-editor.tsx`
- `packages/core/app/src/components/navigation/note-breadcrumb.tsx`
- `packages/core/service-core/src/workbench-state-service.ts`

Plan:

- Prefer `useAtomValue` or derived atoms in React render paths.
- Reserve `resolveAtoms()` for command/service code.
- Store serializable dialog intent/config in service state.
- Keep callback execution in command handlers or a dialog controller layer.

Verification:

- Unit tests for dialog open/submit/cancel flows.
- React tests confirm rerender when relevant atoms change.

### P3.3 Translate Remaining User-Visible Strings

Problem:

- Production user-visible strings bypass the global `t` object.
- One UI component imports `t` directly despite the project convention.

Evidence:

- `packages/core/omni-search/src/index.tsx`

Plan:

- [x] Add the complete Omni Search surface to the English and German bundles.
- [x] Replace the remaining Omni Search group headings, empty state, accessible
  dialog name, and input placeholder with global `t` references.
- [x] Verify the audited app-sidebar, slash-command, link-menu, and star-button
  strings use the global `t` object.
- [x] Remove direct `t` imports from the audited production UI components.
- [x] Replace the placeholder translation test with bundle parity coverage and
  add German-locale browser coverage for the Omni Search surface.

Verification:

- [x] `packages/core/app/src/__tests__/translation.spec.ts`
- [x] `packages/shared/translations/src/__tests__/translations.spec.ts`
- [x] `packages/tooling/e2e-tests/src/translations-locale.e2e.ts`

### P3.4 Fix Dialog And Custom Control Accessibility

Problem:

- The original command-dialog, sidebar search, and workspace-storage selector
  accessibility findings have been resolved on `main`.

Evidence:

- `packages/ui/shadcn/src/command.tsx`
- `packages/ui/ui-components/src/app-sidebar.tsx`
- `packages/ui/ui-components/src/workspace-dialog.tsx`

Plan:

- [x] Keep command-dialog title and description elements inside
  `DialogContent` where the dialog primitive expects them.
- [x] Give every command dialog an accessible description.
- [x] Replace the sidebar pseudo-button with a real button or fully implement
  Space, Enter, focus, and label semantics.
- [x] Use native radio inputs in a labeled radiogroup for workspace type
  selection.

Verification:

- [x] Component tests select workspace storage choices by radio role and
  accessible name.
- [x] App E2E opens the workspace dialog by its accessible name and completes
  the Browser workspace flow.

### P3.5 Split Overloaded Sidebar Composition

Problem:

- Core `AppSidebar` handles command wiring, footer menu composition, workspace
  mapping, truncation policy, file actions, and drag/drop behavior together.

Evidence:

- `packages/core/app/src/layout/app-sidebar.tsx`

Plan:

- Extract a `useSidebarModel` hook for derived workspace/path data.
- Extract sidebar action handlers into small functions or a command adapter.
- Keep presentational sidebar pieces in `ui-components`.
- Preserve existing drag/drop behavior during the split.

Verification:

- Unit tests for derived model output.
- Existing E2E workspace navigation and drag/drop smoke.

## Priority 4: Tooling, CI, And Validation Hardening

### P4.1 Run Production Build In CI And Local CI

Problem:

- GitHub Actions run lint, unit tests, and E2E, but not the production build.
- `local-ci-check.sh` only runs root scripts ending in `:ci`, so it skips
  `build`.

Evidence:

- `.github/workflows/node.js.yml`
- `local-ci-check.sh`
- `package.json`

Plan:

- Add a CI build job that runs `pnpm run build`.
- Add `build:ci` or explicitly include `pnpm run build` in
  `local-ci-check.sh`.
- Keep build after lint/test unless build catches type or bundling issues that
  should fail earlier.

Verification:

- GitHub Actions build job passes.
- `pnpm local-ci-check` includes build.

### P4.2 Fix Playwright CI Hygiene

Problem:

- A sample Playwright test hits `https://playwright.dev/`, making CI depend on
  external network and not the app.
- Playwright artifact upload path points at repo-root `playwright-report/`, but
  package reports are under `packages/tooling/e2e-tests`.
- One `.e2e.tsx` file imports component-test APIs.

Evidence:

- `packages/tooling/e2e-tests/src/sample.e2e.ts`
- `packages/tooling/e2e-tests/src/workspace-dialog.e2e.tsx`
- `packages/tooling/e2e-tests/playwright.config.ts`
- `.github/workflows/node.js.yml`

Plan:

- [x] Delete or replace the external sample with a local app smoke test.
- [x] Upload `packages/tooling/e2e-tests/playwright-report/` and relevant
  `test-results/` paths.
- [x] Move component-style tests to CT or import from `@playwright/test`.
- [x] Wait for the exact newly created note editor before follow-up E2E input,
  and cover selecting an already-selected current day in the slash date picker.

Verification:

- `pnpm e2e:ci`
- CI artifact contains the expected report.

### P4.3 Add Coverage Paths For Data-Safety Packages

Problem:

- `@vitest/coverage-v8` is installed, but there is no coverage script, config,
  or threshold.

Evidence:

- `package.json`
- `vitest.config.ts`

Plan:

- Add `test:coverage`.
- Start with package-level thresholds for:
  - `packages/js-lib/baby-fs`
  - `packages/core/service-core`
  - `packages/platform/service-platform`
  - `packages/core/editor`
  - Markdown-related `banger-editor` modules
- Keep initial thresholds realistic, then ratchet.

Verification:

- `pnpm test:coverage`

### P4.4 Strengthen Workspace Validation

Problem:

- `@bangle.io/custom-scripts` opts out of workspace validation even though it
  owns validation logic.
- Test-file classification only recognizes `__tests__` patterns, missing
  `.spec`, `.test`, `.ct`, `.e2e`, stories, and config files.
- One parser test for imports in comments is skipped.

Evidence:

- `packages/tooling/custom-scripts/package.json`
- `packages/tooling/custom-scripts/lib/workspace-helper.ts`
- `packages/tooling/custom-scripts/lib/__tests__/find-all-imported-paths.spec.ts`
- `packages/tooling/custom-scripts/scripts/validate-all.ts`

Plan:

- Replace broad `skipValidation` with narrow exceptions.
- Classify test, story, CT, E2E, and config files explicitly.
- Fix or document import-parser limitations around comments.
- [x] Add a validation rule for package-private `src` imports.

Verification:

- `pnpm run custom-validation`
- Tooling parser tests.

### P4.5 Align Lint Policy With Project Standards

Problem:

- `noExplicitAny` and `noUnusedVariables` remain warnings globally.
- Tooling disables `noExplicitAny`.
- CSS and HTML are excluded from Biome file includes, while Tailwind/CSS are
  part of the shipped app.

Evidence:

- `biome.json`
- `packages/tooling/browser-entry/package.json`

Plan:

- Ratchet lint warnings to errors package by package, starting outside tooling.
- Add a cleanup budget for real `any` and floating promise violations.
- [x] Remove the stale browser-entry package-local ESLint script.
- Decide whether CSS/HTML formatting is handled by Biome, another formatter, or
  an explicit documented exclusion.

Verification:

- `pnpm lint`
- `pnpm run lint:ci`

## Priority 5: Smaller Typed Cleanups

### P5.1 Reduce Unsafe TypeScript In Shared And Core

Problem:

- `any`, unsafe casts, and broad suppressions remain in shared/core code.
- Some are unavoidable adapter boundaries, but others can be typed locally.

Evidence:

- `packages/shared/base-utils/*`
- `packages/shared/types/commands.ts`
- `packages/core/initialize-services/src/initialize-services.ts`
- `packages/core/service-core/src/command-dispatch-service.ts`
- `packages/js-lib/banger-editor/src/*`
- `packages/tooling/test-utils/test-service-setup.ts`

Plan:

- Separate public API `any` from internal implementation `any`.
- Replace command arg `any` with inferred validator output where feasible.
- Add typed wrappers around native browser APIs that currently require casts.
- [x] Remove avoidable `any` and obsolete prototype fallback logic from the
  foundational `BaseError` and IndexedDB adapter slice.
- [x] Narrow the logger console adapter and replace its avoidable `any[]`
  message boundary with `unknown[]`.
- [x] Move mini validators, weak caches, and command validator inspection to
  `unknown`/object-constrained boundaries.
- [x] Remove the zero-consumer storage-provider labels, hidden/support flags,
  and optional search methods from the public provider contract and concrete
  adapters.
- [x] Remove the zero-consumer `sha` create/write options and constrain provider
  workspace types to `WorkspaceStorageType`.
- Keep intentional negative type tests using `@ts-expect-error`.

Verification:

- Typecheck and focused unit tests.
- `rg -n "as any|: any|@ts-expect-error|biome-ignore" packages/core packages/shared packages/js-lib`

### P5.2 Standardize File Filtering Across Storage Backends

Current status:

- Shared file and directory visibility policy now lives in `@bangle.io/ws-path`
  with focused hidden/system-file coverage.
- Native FS applies the shared directory policy while walking the tree.
- IndexedDB and memory still return unfiltered adapter listings; the shared
  file policy is applied later by `FileSystemService.listFiles`. Moving that
  file filtering to every adapter, with contract coverage, remains open.

Evidence:

- `packages/platform/service-platform/src/file-storage-nativefs.ts`
- `packages/js-lib/baby-fs/indexed-db-fs.ts`
- `packages/js-lib/baby-fs/native-browser-fs.ts`
- `packages/core/service-core/src/file-system-service.ts`

Plan:

- [x] Centralize supported file and ignored directory policy in a shared lower-layer
  helper that platform can import.
- Apply file filtering consistently in Native FS, IndexedDB, and memory
  adapters without changing direct-file access semantics.
- Add tests for hidden/system/unsupported files.

Verification:

- Storage adapter unit tests.
- Workspace list E2E with mixed files.

### P5.3 Preserve Error Cause Details Across Storage Boundaries

Problem:

- The IndexedDB adapter converted upstream failures to broad storage errors
  without preserving original cause details.

Evidence:

- `packages/js-lib/baby-fs/indexed-db-fs.ts`
- `packages/js-lib/native-fs/src/errors.ts`

Plan:

- [x] Preserve original error cause for generic IndexedDB failures and mapped
  constraint failures.
- [x] Verify the replacement Native FS error normalization preserves causes.
- [x] Keep user-facing messages safe and readable while retaining structured
  diagnostic details on the error object.

Verification:

- [x] Unit tests assert error code and cause shape.

### P5.4 Align Cross-Context Messaging Lifetimes And Payload Isolation

Problem:

- A bus created with an already-aborted owner remained connected because an
  abort listener added after abort never runs.
- An already-aborted subscription was still registered and could continue
  receiving messages indefinitely.
- Sending after disposal was a silent no-op for the memory channel but could
  throw through a closed native channel.
- The memory fallback shared the same mutable payload object with every
  recipient, unlike native `BroadcastChannel` structured-clone isolation.
- `MemoryBroadcastChannel` claimed the full browser interface while three
  inherited event methods only threw `Method not implemented`.

Evidence:

- `packages/js-lib/browser-utils/src/broadcast-channel.ts`
- `packages/js-lib/browser-utils/__tests__/broadcast-channel.spec.ts`

Plan:

- [x] Close immediately when the owner signal is already aborted.
- [x] Ignore subscriptions whose signal is already aborted.
- [x] Make post-disposal sends consistently inert.
- [x] Structured-clone payloads independently for memory-channel recipients.
- [x] Type the fallback against the minimal channel contract it supports.
- [x] Apply the same already-aborted subscription and idempotent-disposal
  semantics to the generic emitter used by root events.

Verification:

- [x] Focused tests cover already-aborted owners and subscriptions.
- [x] Focused tests prove independent mutable payloads for memory recipients.
- [x] Focused emitter tests cover already-aborted subscriptions and repeated
  destruction.
- [x] Browser-utils and logger unit suites pass.
- [x] Repository project-reference typecheck passes.
- [x] `pnpm lint:ci`, `pnpm test:ci`, `pnpm build`, and `pnpm e2e:ci`
  pass. The E2E run had one unrelated cursor-restoration retry.
- [x] `pnpm local-ci-check` passes every root CI script, including E2E,
  component tests, desktop builds/tests, and the Electron persistence smoke.
  Its E2E run had one unrelated file-explorer retry.

## 2026-07-12 Core/App Containment Re-audit

This matrix reconciles the focused core/app audit against current code and the
first two cleanup batches. It is the durable handoff for findings that were not
covered precisely by the original 2026-06-15 audit. A resolved item remains
listed so future agents do not rediscover it or accidentally restore it.

### Correctness First

| ID | Status | Finding and required boundary | ROI |
| --- | --- | --- | --- |
| C1 | Resolved in 2026-07-13 workspace refresh continuity cleanup | `WorkspaceStateService` now derives `$workspaces` from an explicit `$workspaceListState` resource. Failed refreshes retain the last successful data and error, preserve `$currentWsName`, and can recover to `ready`; real-service coverage forces the full success-failure-recovery sequence. | Critical / medium |
| C2 | Resolved in PR #631 | `PmEditorService` now caches `markdownLoader` instances per ProseMirror `Schema` in a `WeakMap`. A real two-editor regression proves paste uses the active editor schema. | High / small-medium |
| C3 | Partial | PR #631 made the Native FS metadata lookup awaitable and report invalid metadata as command failure. `CommandDispatchService.dispatch()` still returns `void`, reports a missing handler as success, converts null args with `args || {}`, releases cycle/focus state before async completion, and detaches non-app async errors. Native FS permission work also occurs later in a dialog callback, outside command completion. Make command completion an awaitable typed result and move callback-owned workflows behind feature controllers. | Critical / medium |
| C4 | Open; coordinate after PR #640 | The editor save-queue store remains module-global while each queued task captures the writer and error emitter from the service instance that enqueued it. UI reload rebuilds the service graph, so retrying a retained failure can execute through a disposed graph. PR #640 is actively changing relocation and save-queue behavior but does not own this service-graph lifetime boundary. Move the store to an explicit root-lifetime coordinator and resolve the current writer at execution time; test a failed save across `event::app:reload-ui`. | Critical data safety / medium |
| C5 | Resolved in 2026-07-12 workspace dialog cleanup | `CreateWorkspaceDialog` now accepts and awaits async durable creation, blocks duplicate submission and dismissal while pending, preserves the dialog with an alert on failure, and permits retry. Component coverage counts one callback for a double-click; app E2E exercises the real duplicate-workspace service rejection. | High / medium |
| C6 | Partial; plan 006 owns the UX | `PageAsset` now has distinct internal `missing` and `error` states, but its catch still discards storage/permission/decode/object-URL causes and both states render the same generic unavailable copy. Emit/log the retained error, expose retry/recovery, and test Native FS permission loss after PR #626's external-sync work settles. | High / small-medium |
| C7 | Resolved in PR #631 | Workspace info cache entries are keyed by workspace name and filtered after lookup. Memory storage now compares parsed workspace names exactly and rejects rename over an existing destination, with focused contract regressions. | Medium-high / small |
| C8 | Resolved in PR #632 | Settings return-link validation rejects both raw scheme-relative inputs and paths that normalize to `//host/...`; unit and browser E2E coverage retain the normalized-path regression. | Security blocker / small |

### Architecture And Ownership Backlog

| ID | Status | Refactor and containment goal | Expected reduction or benefit |
| --- | --- | --- | --- |
| A1 | Open; extends P3.2 | Move dialog intents and transient feature state out of `WorkbenchStateService`. It still imports UI prop types and stores callbacks/icons/full dialog props, plus Omni and All Files state, inside `service-core`. Put feature-owned state and callback execution beside the owning app feature; keep durable preferences in the service. | 250-500 LOC; removes core-to-UI coupling |
| A2 | Open | Replace the global `commandKeyToContext` WeakMap and string-selected service-locator kernel with direct typed handler context. Colocate command metadata and handlers by feature; keep only serializable cross-context command contracts in shared. | 100-200 LOC; explicit dependencies |
| A3 | Open; reopens P2.3 | Remove the hidden Native FS upward dependency. `initialize-services` currently gives the platform storage adapter a late-bound closure that calls core `WorkspaceOpsService`. Introduce a core-owned workspace storage-session/root-handle registry with explicit invalidation and a downward platform contract. | Removes reload/recovery glue and runtime cycle |
| A4 | Partial | PR #631 deleted `WorkspaceService` and pass-through `WorkbenchService` and strengthened graph validation. The 2026-07-12 cleanup batches removed the unused `WorkbenchStateService` database dependency plus the zero-consumer command-key cache/getter, navigation `fromUri` pass-through, and workspace misc-data methods/error variant. The core aggregate is still repeated in `coreServiceClasses`, `coreServiceSlots`, `getCoreInstances`, `toCoreServices`, and public service types; derive those views from one descriptor in a separate slice. | 150-250 LOC originally; remaining benefit is one derived service graph |
| A5 | Open | Fold All Files into Omni Search as a file-only scope. Both surfaces independently map workspace files, fuzzy-search, virtualize results, dispatch navigation, and maintain separate open/input state. | 184-230 LOC |
| A6 | Open; remainder of P3.5 | Move the one-caller Bangle-specific `ui-components/AppSidebar` composition into `core/app/features/sidebar`. Keep reusable sidebar and file-tree primitives in UI, but remove the roughly 30-prop adapter boundary split across a 582-line UI component and its sole app caller. | About 100-200 LOC and one feature boundary |
| A7 | Resolved in PR #632 | Delete the five zero-producer fatal/auth/missing routes, their pages/types/decoder branches/translations, and unused `ROUTES`; stale IDs decode through normal `not-found`. | 205 net code LOC before review hardening |
| A8 | Open; tracked by plan 007 | Extract backlink indexing from `WorkspaceStateService`. Current content-update signals trigger a debounced serial full-workspace reread, and a failed rebuild returns an empty map. A dedicated index service should update per source from typed file events, use bounded concurrency, ignore stale generations, and retain last-good data. | Performance, failure semantics, ownership |
| A9 | Partial | PR #631 stopped the switch-workspace dialog from mutating the atom array with `.sort()`. Welcome, switcher, and settings still need one immutable workspace-summary model and one sorting policy; cached workspace objects/arrays should not be exposed as mutable shared state. | 80-150 LOC and consistent ordering |
| A10 | Resolved in 2026-07-12 high-ROI batch | Production editor setup no longer enables debug mode, installs schema/view/helpers on `window`, or ships the console inspection helpers. E2E coverage now observes the DOM instead of the removed private global. | Removed 313 source lines and the production debug surface |
| A11 | Open | Collapse `settings-general` and `settings-workspaces` into one `settings` route with a typed page payload and one command. Page selection is currently repeated across route types, constants, decoders, commands, handlers, and app rendering. | Smaller cross-layer route surface |

### Test Architecture Follow-up

- T1 — split the monolithic `@bangle.io/test-utils` barrel. The package
  runtime-depends on command handlers, initialization, core, and platform while
  those packages dev-depend back on test-utils; its own common setup modules
  also form a direct import cycle. Keep lightweight common options separate
  from full production-wiring helpers.
- T2 — preserve the real memory-backed production wiring, but replace repeated
  storage-adapter and router-strategy cases with parameterized contract suites.
  The audit estimated 550-850 removable test lines while increasing backend and
  strategy parity coverage.

### Target Boundary

- `service-core`: durable domain state, workflows, and preferences; no React
  components, UI prop types, or callback-bearing dialog models.
- `app/features/*`: feature UI, transient state, dialog controllers, and
  feature-specific command registration.
- `ui/*`: reusable primitives only; Bangle-branded one-caller compositions stay
  in app.
- `platform/*`: browser and storage mechanisms that never call upward into
  core.
- `initialize-services`: one derived graph and explicit session providers, not
  parallel registries or late-bound upward closures.

### Recommended Next Batches

1. C4 save-coordinator lifetime, because a retained task can outlive its
   service graph and endanger unsaved user data.
2. C3 command completion, with real-service failure tests and no detached
   promises. C5 async workspace creation is complete.
3. C6 asset read/recovery semantics, aligned with plan 006.
4. A1-A4 boundary work in independently reviewable slices; do not combine the
   command kernel, Native FS session provider, and service-graph derivation in
   one PR.
5. A5, A6, A9, A10, and A11 as code-reduction batches with user-visible E2E
   coverage where navigation or interaction changes.
6. A8 through plan 007, after correcting the temporary index's failure and
   concurrency assumptions.

## Original 2026-06-15 Suggested Execution Order

1. Editor save queue, error surfacing, and pending-save state.
2. Await command storage mutations and add failure-ordering tests.
3. File tree failure behavior and recoverable rename design.
4. Markdown golden fixture suite.
5. Shared types/package boundary refactor and `src` import validation.
6. CI build and Playwright hygiene.
7. Duplicate component deletion and translation sweep.
8. Accessibility fixes for dialogs and sidebar controls.
9. Lint ratchet and unsafe TypeScript cleanup.

## Verification Matrix

Use the smallest relevant check for each cleanup slice, then run wider checks
before merging broad changes:

- `pnpm run custom-validation`
- `pnpm typecheck`
- `pnpm test:ci`
- `pnpm build`
- `pnpm e2e:ci`
- `pnpm biome check --fix --unsafe && pnpm local-ci-check`

For data-safety changes, add manual smoke testing:

- Create a Browser workspace.
- Create a note and type content.
- Reload and confirm content persists.
- Rename and move the note, then reload.
- Simulate a rejected write and confirm the UI shows unsaved/error state without
  losing editor content.

## Known Blockers And Decisions Needed

- Decide how Bangle.io should treat unsupported Markdown constructs:
  preserve raw regions, warn before edit, or normalize intentionally.
- Decide whether underline should remain available for Markdown-backed notes.
- Decide whether CSS/HTML linting belongs in Biome or a separate formatter.

## Audit Notes

- This plan was built from targeted repo scans plus four independent subagent
  audits.
- No findings here should be treated as a confirmed production incident without
  reproducing the behavior in a focused test.
- The priority ordering intentionally favors user-data safety and Markdown
  fidelity over cosmetic cleanup.
