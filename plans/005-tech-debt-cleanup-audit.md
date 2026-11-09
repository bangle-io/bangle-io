---
title: Tech Debt Cleanup Audit
status: active
type: plan
archived: false
archived_on:
created: 2026-06-15
updated: 2026-08-01
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
  - https://github.com/bangle-io/bangle-io/pull/640
  - https://github.com/bangle-io/bangle-io/pull/644
  - https://github.com/bangle-io/bangle-io/pull/648
  - https://github.com/bangle-io/bangle-io/pull/649
  - https://github.com/bangle-io/bangle-io/pull/658
  - https://github.com/bangle-io/bangle-io/pull/667
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/563
---

# Tech Debt Cleanup Audit

## Summary

This plan consolidates a multi-agent audit of the repository into a sequenced
cleanup roadmap. The audit focused on Bangle.io priorities: protect user data,
preserve Markdown fidelity, keep local-first behavior predictable, and maintain
clear workspace boundaries.

Save serialization/coalescing, relocation safety, last-good workspace-list
retention, and save retry continuity across UI service-graph replacement have
landed. The most urgent remaining cleanup areas are detached asynchronous
workflows, recovery gaps, and the open package-boundary items below.

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
  action, and a successful retry clears protection. PR #649 resolves the
  cross-reload lifetime boundary through the explicit browser-root save
  coordinator described by C4 below.
- P0.2 started with explicit editor load rejection handling that emits an app
  error instead of leaving the mount promise silently pending. Failed load
  status and a same-node retry API are now exposed. Parse-failure isolation and
  the user-facing recovery view remain.
- Landed-batch history (full detail lives in the per-item records below and
  the 2026-07-12 matrix):
  - 2026-07-07: re-audit and cleanup pass — verified P0.3/P2.1/P2.2/P3.1
    resolved on main; landed P0.4 rename destination verification, P0.5
    file-tree retention, the P1.1 golden corpus and load-time round-trip
    gate, P2.3 config-thunk wiring, P3.2 render subscriptions, P3.5 sidebar
    decomposition, P4.1 CI build, and the P4.5 `noFloatingPromises` error.
  - 2026-07-12: high-ROI batch — A10 production debug surface removed, P4.2
    Playwright hygiene, A4 unused database dependency dropped, P3.3
    StarButton translation.
  - 2026-07-12 (PR #636): zero-consumer service APIs removed (A4).
  - 2026-07-12: C5 durable workspace-creation dialog and P3.4 sidebar search
    accessibility.
  - 2026-07-12: P5.3 IndexedDB error causes and a P5.1 type-hygiene slice.
  - 2026-07-13: C1 `$workspaceListState` refresh continuity with real-service
    failure/recovery coverage.
  - 2026-07-13: P5.4 broadcast-bus lifetimes and payload isolation plus P5.1
    logger typing.
  - 2026-07-13 (PR #646): foundational validator/cache/emitter typing and
    lifecycle (P5.1, P5.4) plus the P4.5 ratchet re-audit.
  - 2026-07-14 (PR #647): storage-contract and translation hygiene — P3.3
    completed, P5.1 provider-surface pruning, P4.2 E2E helper waits; the
    batch deferred to PR #640 (relocation), PR #644 (Native FS settings
    command), and PR #626 (external sync) ownership.
  - 2026-07-15 (PR #640): P0.4 relocation-safety slice for ordinary file and
    directory rename/move, with reload coverage and star migration.
  - 2026-07-18 (PR #649): C4 browser-root `EditorSaveCoordinator` owning save
    continuity across UI service-graph replacement.
  - 2026-07-19 (PR #658): P1.3 list fidelity across both editor engines.
  - 2026-07-21 (PR #667, merged 2026-07-22): broad sweep removing dead code
    and obsolete tooling, consolidating repeated editor/router/service/script
    behavior behind existing owners, and hardening Native FS rename,
    sync-value, malformed-state, and mobile-origin boundaries. The
    command-completion, asset-recovery, package-boundary, and workspace-index
    items below remain separate follow-ups.
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

Done. The editor owns a per-`wsPath` save queue that serializes writes and
coalesces rapid edits to the latest pending document, so an older completion
cannot overwrite a newer edit. Save state (clean/pending/failed) is exposed
with change subscriptions, failed latest saves retain the unsaved body for an
explicit translated retry action, failures route through the app error system,
and pending or failed saves activate browser navigation/reload protection.
PR #649 (C4) moved queue lifetime to an explicit browser-root
`EditorSaveCoordinator` that survives UI service-graph replacement. Unit,
integration, and Playwright coverage exercise delayed writes, rejected writes,
retained-body retry, and protection clearing. A separate `retrying` state is
only needed if automatic retry is ever added.

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

Done; verified resolved on main during the 2026-07-07 re-audit. Workspace
command handlers await storage mutations before navigating, route rejected
mutations through command failure handling, and keep the current route stable
when a destructive operation fails. `ws-command-handlers.spec.ts` covers the
failure ordering. Do not reintroduce fire-and-forget mutations followed by
navigation.

### P0.4 Make Rename/Move Recoverable

Problem:

- IndexedDB and Native FS rename are implemented as copy-then-delete.
- A crash, permission loss, quota failure, or partial write can leave duplicate
  files or incomplete moves.

Current status:

- 2026-07-07: baby-fs rename verifies destination bytes before deleting the
  source and throws `RENAME_VERIFICATION_FAILED_ERROR` with cause;
  failure-point tests cover both backends.
- PR #640 landed the relocation-safety slice for ordinary file and directory
  rename/move: pending source saves drain before the durable mutation, queued
  and mounted writes retarget afterward, IndexedDB rename/update paths are
  atomic, active routes follow durable rename events, and starred paths
  migrate in one lifecycle, with unit, race, command-handler, and Playwright
  coverage including reload persistence.
- Remaining: journaled pending-move records, startup recovery for incomplete
  moves, cross-workspace moves (issue #563 UX), empty-folder persistence, and
  link rewriting.

Evidence:

- `packages/js-lib/baby-fs/indexed-db-fs.ts`
- `packages/js-lib/native-fs` and
  `packages/platform/service-platform/src/file-storage-nativefs.ts` (the
  Native FS side; the legacy baby-fs native adapter no longer exists)

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

Done. `WorkspaceStateService` preserves the last known file tree on
same-workspace list failures, exposes `$fileTreeListState`, and the sidebar
shows a recoverable retry notice backed by `command::ws:refresh-file-tree`.
The parallel `$workspaces` metadata-refresh gap was tracked as C1 and resolved
by `$workspaceListState` on 2026-07-13. Keep `Note Not Found` reserved for
confirmed absence, never for load failure.

## Priority 1: Markdown Fidelity

### P1.1 Add Golden Markdown Round-Trip Fixtures

Problem:

- Markdown is parsed into ProseMirror and serialized back after edits.
- There is no clear raw-preservation layer for frontmatter, raw HTML, tables,
  unknown directives, or unsupported constructs.

Current status:

- The shared golden corpus (`test-utils/markdown-corpus.ts`) and a load-time
  round-trip fidelity gate in `PmEditorService` (warns when a note cannot
  round-trip; opening never writes back) landed 2026-07-07. Per-construct
  parity decisions live in plan 012.

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

Done in PR #658. The shared golden corpus covers unchecked, checked,
uppercase, nested, mixed, linked, marked-up, and empty task items for both
editor engines, and the merged implementation preserves tight/loose list
semantics, ordered task-list container kind, and structural marker widths for
stable nested indentation. ProseMirror derives flat list items from configured
kind/checked attributes rather than wrapper list tokens. Shared corpus,
command, codec, DOM, persistence, and reload coverage protect the
cross-engine behavior.

## Priority 2: Architecture And Package Boundaries

### P2.1 Split Shared Types Away From Core Implementations

Done; verified resolved on main during the 2026-07-07 re-audit.
`@bangle.io/types` no longer imports concrete core/editor services and stays
limited to cross-layer contracts. The intentional validator exception for
`@bangle.io/types` remains type-only; do not use it to move runtime logic
across layers.

### P2.2 Ban Package-Private `src` Imports Across Package Boundaries

Done; verified resolved on main during the 2026-07-07 re-audit. No
`@bangle.io/*/src` imports cross package boundaries, and custom validation
rejects package-private `src` imports outside the owning package (see the
P4.4 checkbox). Import other workspaces only through package roots.

### P2.3 Remove Post-Construction Service Wiring

Problem:

- `FileSystemService` declares no DI deps, then receives storage services and
  workspace lookup through mutable properties.

Current status:

- Storage services now reach `FileSystemService` via a config thunk resolved
  inside `instantiate()` and asserted before use (2026-07-07). The Native FS
  half is reopened as A3: the platform root-handle provider still calls
  upward into core through a late-bound closure.

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

Done; verified resolved on main during the 2026-07-07 re-audit. The duplicate
top-level component tree is gone; the `common`, `feedback`, and `navigation`
variants are canonical. Do not reintroduce parallel component trees for the
same surface.

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

Done in the 2026-07-14 batch (PR #647), after the StarButton fix in the
2026-07-12 batch. Every Omni Search heading, action, empty state, placeholder,
and accessible dialog title uses the global `t` object; English and German
carry the complete surface; direct `t` imports were removed from the audited
production UI components. Bundle parity is covered by
`packages/shared/translations/src/__tests__/translations.spec.ts`, and
`packages/tooling/e2e-tests/src/translations-locale.e2e.ts` opens the German
command bar and verifies translated user-visible behavior.

### P3.4 Fix Dialog And Custom Control Accessibility

Done; resolved on main plus the 2026-07-12 batch. Command dialogs keep title
and description elements inside `DialogContent` with accessible descriptions,
the sidebar search affordance is a semantic button with native Enter/Space
behavior, and workspace type selection uses native radio inputs in a labeled
radiogroup. Component tests select storage choices by radio role and
accessible name; app E2E covers the Space-key search path and the Browser
workspace flow.

### P3.5 Split Overloaded Sidebar Composition

Done for app-level decomposition (2026-07-07 pass): sidebar file-tree actions
moved to `useSidebarFileActions`, the footer menu moved to
`SidebarFooterMenu`, and core `AppSidebar` is a thin composition layer with
drag/drop behavior preserved. The remaining work — moving the one-caller,
Bangle-specific `ui-components/AppSidebar` composition into
`core/app/features/sidebar` — is tracked as A6 in the 2026-07-12 matrix.

## Priority 4: Tooling, CI, And Validation Hardening

### P4.1 Run Production Build In CI And Local CI

Done (2026-07-07 pass): GitHub Actions runs `pnpm run build`, so production
build breakage fails CI.

### P4.2 Fix Playwright CI Hygiene

Done in the 2026-07-12 batch. The external `playwright.dev` sample was
deleted, E2E and component reports/results use separate package-local
directories, CI uploads those actual artifact paths, and component-style
tests were moved off the `.e2e.tsx` import mix. PR #647 additionally made the
shared create-workspace/note E2E helper wait for the exact new editor
identity before follow-up input, and made the slash date picker's initial
single-day selection required so UTC CI cannot toggle to an empty selection.
Do not reintroduce network-dependent sample tests.

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

Current status:

- `noFloatingPromises` is a Biome error repo-wide (2026-07-07);
  `noExplicitAny` (163 sites at that count) and `noUnusedVariables` remain
  warnings. A package-wide `noExplicitAny` ratchet was trialled alongside PR
  #646 but dropped: de-wildcarding the generic emitter needed conditional
  types and a double assertion without rejecting more invalid callers.

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

- `packages/platform/service-platform/src/file-storage-nativefs.ts` and
  `packages/js-lib/native-fs` (the Native FS side; the legacy baby-fs native
  adapter no longer exists)
- `packages/js-lib/baby-fs/indexed-db-fs.ts`
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

Done. The IndexedDB adapter (`packages/js-lib/baby-fs/indexed-db-fs.ts`)
retains the original rejection as `Error.cause` for generic upstream errors
and translated constraint failures, and the replacement Native FS library
(`packages/js-lib/native-fs/src/errors.ts`) preserves causes when normalizing
browser errors. Unit tests assert error code and cause shape. The legacy
Native Browser FS evidence was removed together with that adapter.

### P5.4 Align Cross-Context Messaging Lifetimes And Payload Isolation

Done (2026-07-13 batches; PR #646 for the emitter slice). `TypedBroadcastBus`
closes immediately for an already-aborted owner, ignores already-aborted
subscriptions, and makes post-disposal sends a consistent no-op across native
and memory channels. The in-memory channel structured-clones payloads
independently per recipient and is typed against the minimal channel contract
it implements instead of the full throwing `BroadcastChannel` interface. The
generic emitter used by root events applies the same already-aborted and
idempotent-destruction semantics, and the two-key weak cache retains cached
`undefined` results. Focused suites cover all of the above, and the batch
passed `pnpm local-ci-check` end to end.

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
| C4 | Resolved in [PR #649](https://github.com/bangle-io/bangle-io/pull/649) | The module-global save store is replaced by an explicit browser-root `EditorSaveCoordinator` injected into each UI service graph. Retained tasks carry document state but resolve the writer and error boundary from the current graph at execution time. Unit coverage retries through a disposed graph facade, and browser E2E forces a failed save across `event::app:reload-ui` before proving durable recovery after a full reload. | Critical data safety / medium |
| C5 | Resolved in 2026-07-12 workspace dialog cleanup | `CreateWorkspaceDialog` now accepts and awaits async durable creation, blocks duplicate submission and dismissal while pending, preserves the dialog with an alert on failure, and permits retry. Component coverage counts one callback for a double-click; app E2E exercises the real duplicate-workspace service rejection. | High / medium |
| C6 | Partial; plan 006 owns the UX | `PageAsset` now has distinct internal `missing` and `error` states, but its catch still discards storage/permission/decode/object-URL causes and both states render the same generic unavailable copy. Emit/log the retained error, expose retry/recovery, and test Native FS permission loss after PR #626's external-sync work settles. | High / small-medium |
| C7 | Resolved in PR #631 | Workspace info cache entries are keyed by workspace name and filtered after lookup. Memory storage now compares parsed workspace names exactly and rejects rename over an existing destination, with focused contract regressions. | Medium-high / small |
| C8 | Resolved in PR #632 | Settings return-link validation rejects both raw scheme-relative inputs and paths that normalize to `//host/...`; unit and browser E2E coverage retain the normalized-path regression. | Security blocker / small |

### Architecture And Ownership Backlog

| ID | Status | Refactor and containment goal | Expected reduction or benefit |
| --- | --- | --- | --- |
| A1 | Open; extends P3.2 | Move dialog intents and transient feature state out of `WorkbenchStateService`. It still imports UI prop types and stores callbacks/icons/full dialog props, plus Omni and All Files state, inside `service-core`. Put feature-owned state and callback execution beside the owning app feature; keep durable preferences in the service. | 250-500 LOC; removes core-to-UI coupling |
| A2 | Open | Replace the global `commandKeyToContext` WeakMap and string-selected service-locator kernel with direct typed handler context. Colocate command metadata and handlers by feature; keep only serializable cross-context command contracts in shared. | 100-200 LOC; explicit dependencies |
| A3 | Open; reopens P2.3 | Remove the hidden Native FS upward dependency. `initialize-services` currently gives the platform storage adapter a late-bound closure that calls core `WorkspaceOpsService`. Introduce a core-owned workspace storage-session/root-handle registry with explicit invalidation and a downward platform contract. Plan 019 M4 owns the router late-bound closure; A3's remaining half is the workspaceOps/root-handle capability injection. | Removes reload/recovery glue and runtime cycle |
| A4 | Partial | PR #631 deleted `WorkspaceService` and pass-through `WorkbenchService` and strengthened graph validation. The 2026-07-12 cleanup batches removed the unused `WorkbenchStateService` database dependency plus the zero-consumer command-key cache/getter, navigation `fromUri` pass-through, and workspace misc-data methods/error variant. The core aggregate is still repeated in `coreServiceClasses`, `coreServiceSlots`, `getCoreInstances`, `toCoreServices`, and public service types; derive those views from one descriptor in a separate slice. | 150-250 LOC originally; remaining benefit is one derived service graph |
| A5 | Open | Fold All Files into Omni Search as a file-only scope. Both surfaces independently map workspace files, fuzzy-search, virtualize results, dispatch navigation, and maintain separate open/input state. | 184-230 LOC |
| A6 | Open; remainder of P3.5 | Move the one-caller Bangle-specific `ui-components/AppSidebar` composition into `core/app/features/sidebar`. Keep reusable sidebar and file-tree primitives in UI, but remove the roughly 30-prop adapter boundary split across a 631-line UI component and its sole app caller. | About 100-200 LOC and one feature boundary |
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

1. C3 command completion, with real-service failure tests and no detached
   promises. C5 async workspace creation is complete.
2. C6 asset read/recovery semantics, aligned with plan 006.
3. A1-A4 boundary work in independently reviewable slices; do not combine the
   command kernel, Native FS session provider, and service-graph derivation in
   one PR.
4. A5, A6, A9, A10, and A11 as code-reduction batches with user-visible E2E
   coverage where navigation or interaction changes.
5. A8 through plan 007, after correcting the temporary index's failure and
   concurrency assumptions.

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
