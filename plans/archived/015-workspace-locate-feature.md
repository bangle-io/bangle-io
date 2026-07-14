---
title: Workspace "Locate folder" action for Native FS workspaces
status: completed
type: plan
archived: true
archived_on: 2026-07-13
created: 2026-07-13
updated: 2026-07-13
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/644
related_issues: []
---

> DONE Completed on 2026-07-13 in PR #644, which carries both this plan and
> the implementation: `revealDirectoryLocation` in `@bangle.io/native-fs`,
> `command::ui:locate-native-fs-workspace` (definition + handler), the gated
> settings-workspaces menu item, and unit + E2E coverage. Final verification
> passed with `pnpm lint:ci`, `pnpm test:ci`, and `pnpm e2e:ci`. Known caveat
> (by design): tests assert the picker mechanism, not the OS dialog's path bar,
> and `startIn` is best-effort when the stored handle is stale.

# Workspace "Locate folder" action for Native FS workspaces

## Summary

Add a per-workspace **Locate folder** action in the Workspaces settings page
(`route=settings-workspaces`) that helps a user answer "where on disk is this
workspace?" for Native File System workspaces.

The File System Access API deliberately never exposes a directory handle's
absolute path — `FileSystemDirectoryHandle` only carries `.name` (the leaf
folder name). So the app genuinely cannot read or display the workspace's
location, and a user with two folders both named `notes` cannot tell them
apart.

The creative workaround: the picker functions accept a
`startIn?: FileSystemHandle` option that anchors the **native OS dialog** at a
folder's real location. We open a directory picker anchored at the workspace's
stored `rootDirHandle` purely so the OS dialog (Finder / Explorer) reveals the
path in its breadcrumb — the human reads it there. Whatever the user then does
in the dialog is **discarded**: selecting a folder does nothing, cancelling does
nothing. The web app never learns the path (privacy preserved by the platform),
but the human does, because the reveal is delegated to the OS chrome.

This is intentionally distinct from the existing Native FS **recovery** flow
([page-native-fs-recovery.tsx](../../packages/core/app/src/pages/page-native-fs-recovery.tsx),
`command::ui:reconnect-native-fs-workspace`), which *rebinds* a lost folder.
Locate never rebinds, never mutates metadata, never navigates, never touches
files.

## Mechanism (already mostly plumbed)

- `DirectoryPickerOpts` already declares `startIn?: FileSystemHandle | string`
  ([native-fs/src/types.ts:17](../../packages/js-lib/native-fs/src/types.ts)) and
  `pickDirectory` already spreads unknown opts into `showDirectoryPicker`
  ([native-fs/src/picker.ts:33](../../packages/js-lib/native-fs/src/picker.ts)).
- `WorkspaceInfo` carries `type: string` and `metadata: Record<string, unknown>`
  ([shared/types/workspace.ts](../../packages/shared/types/workspace.ts)); a
  `nativefs` workspace stores its handle at `metadata.rootDirHandle`
  (see the reconnect handler, which writes it back on recovery).
- `WORKSPACE_STORAGE_TYPE.NativeFS === 'nativefs'`
  ([shared/constants/index.ts:86](../../packages/shared/constants/index.ts)).
- The settings page's `$workspaces` atom resolves to `WorkspaceInfo[]`
  (`workspaceOps.getAllWorkspaces()`), so the row already has `type` to gate on.

Reuse of `pickDirectory` is **not** appropriate here: `pickDirectory` requests
`readwrite` permission on the returned handle, which would fire an unwanted
permission prompt for a mere reveal. Locate needs a thin, reveal-only helper.

## Scope

### 1. `@bangle.io/native-fs` — reveal-only helper (js-lib, lowest layer)

Add an exported helper, e.g. `revealDirectoryLocation(anchor: FileSystemHandle)`:

- Feature-detect via the existing `getShowDirectoryPicker()`
  ([native-fs/src/support.ts](../../packages/js-lib/native-fs/src/support.ts)); if
  absent, throw the typed `NATIVE_FS_ERROR_CODE.unsupported` `NativeFsError`.
- Call `showDirectoryPicker({ startIn: anchor, mode: 'read', id: '<stable>' })`.
- **Discard** the resolved handle; do **not** call `requestPermission` and do
  **not** return the handle.
- Swallow `userAborted` (AbortError) silently — cancelling is the normal,
  expected outcome once the user has read the path.
- Surface only `unsupported` / `activationRequired` as typed errors.

Rationale for layering: the reveal mechanism is a native-fs capability and
belongs beside `pickDirectory`, not in a caller. Keep the typed error taxonomy.

### 2. `@bangle.io/commands` — command definition (shared)

Add `command::ui:locate-native-fs-workspace`, mirroring
`command::ui:reconnect-native-fs-workspace`
([shared/commands/src/ui-commands.ts:335](../../packages/shared/commands/src/ui-commands.ts)):

- `args: { wsName: T.String }`
- `dependencies.services: ['workspaceOps']` (add `workbenchState` only if we
  choose to surface a toast on unsupported)
- `autoFocusEditor: false`, `omniSearch: false` (per-row action, not global
  search; keep it out of omni-search).

### 3. `@bangle.io/command-handlers` — handler (core)

Add the handler next to `nativeFsRecoveryHandlers`
([command-handlers/src/ui-handlers/native-fs-recovery.ts](../../packages/core/command-handlers/src/ui-handlers/native-fs-recovery.ts)):

- `getWorkspaceInfo(wsName, { type: NativeFS })`; if missing → typed
  `error::workspace:not-found`.
- Read `metadata.rootDirHandle`; validate it is a directory handle (has a
  string `.name`). If absent/invalid (a broken entry) → typed info error that
  points at the recovery flow; do not attempt a bare picker (revealing nothing
  useful is worse than a clear message).
- Call `revealDirectoryLocation(rootDirHandle)`.
- Map `unsupported` to a typed app error → toast; never throw a raw
  `DOMException` to the UI.
- Must be dispatched from a user gesture (the menu click satisfies this).

### 4. `packages/core/app` — settings UI

In `WorkspaceActionsMenu`
([page-settings-workspaces.tsx:186](../../packages/core/app/src/pages/page-settings-workspaces.tsx)):

- Thread the workspace `type` (or an `onLocate?`/`isNativeFs` prop) into the
  menu.
- Render a **Locate folder** `DropdownMenuItem` (icon `FolderSearch`, already
  used by the recovery page) **only when** `type === 'nativefs'` **and** the
  picker API is supported. Hide it for `browser`/IndexedDB workspaces (no disk
  location) and on non-Chromium browsers.
- On click: `commandDispatcher.dispatch('command::ui:locate-native-fs-workspace',
  { wsName }, 'ui')`.

### 5. `@bangle.io/translations` — strings (en.ts)

- `t.app.settings.workspaces.locateFolder: 'Locate folder'` (menu item), matching
  the recovery page's `pageNativeFsRecovery.locateFolderButton` tone.
- Error strings under `t.app.errors.workspace.*` for the unsupported and
  missing-handle cases.

## Out of scope

- Rebinding / reconnecting a moved or deleted folder — that is the existing
  `command::ui:reconnect-native-fs-workspace` recovery flow; Locate must never
  write metadata.
- Displaying the path string inside the app — the platform forbids reading it;
  we intentionally delegate the reveal to the OS dialog.
- "Reveal in Finder/Explorer" as a one-click OS action — no web API exists; the
  OS dialog's own breadcrumb / "reveal" affordances are the path.
- Persisting, caching, or logging any resolved path.
- Non-Native-FS workspaces (browser, help, memory, github) — no on-disk folder.

## Verification

- **Unit — native-fs** (`revealDirectoryLocation`): stub global
  `showDirectoryPicker` (mirror
  [picker-and-permissions.spec.ts](../../packages/js-lib/native-fs/src/__tests__/picker-and-permissions.spec.ts)).
  Assert it is called with `startIn` set to the anchor handle; assert the
  resolved handle is discarded and `requestPermission` is never invoked; assert
  a `userAborted`/AbortError resolves without throwing; assert `unsupported`
  when the picker is absent.
- **Unit — command-handlers**: real DI container (mirror
  [native-fs-recovery.spec.ts](../../packages/core/command-handlers/src/__tests__/native-fs-recovery.spec.ts)).
  With a `nativefs` `WorkspaceInfo` carrying a fake `rootDirHandle`, dispatch and
  assert the reveal helper is called with that handle; assert typed errors for
  missing workspace, non-nativefs type, and absent handle; assert no metadata
  write and no navigation occur.
- **E2E — settings-workspaces** (`*.e2e.ts`, required for release): seed one
  `nativefs` and one `browser` workspace; stub `window.showDirectoryPicker` via
  `addInitScript` (as
  [native-fs-recovery.e2e.ts](../../packages/tooling/e2e-tests/src/native-fs-recovery.e2e.ts)
  does). Assert the **Locate folder** action shows only on the nativefs row;
  clicking calls `showDirectoryPicker` with `startIn` set to a handle whose
  `.name` equals the workspace name; and that both selecting a folder and
  cancelling leave the workspace list, note counts, current route, and stored
  metadata **unchanged** (no rebind, no navigation).
- `pnpm lint:ci` and `pnpm test:ci` green; run the settings-workspaces E2E
  filtered while iterating, full `pnpm e2e:ci` before the PR.
- Manual `playwright-cli` smoke on a real Chromium build: create a Native FS
  workspace, open it, then use Locate and confirm the OS dialog opens focused on
  that folder.

## Known blockers / limitations

- **Testability boundary**: the OS dialog's path bar is native chrome outside
  the page, so automated tests can only assert the *mechanism* (picker invoked
  with the correct `startIn`, result discarded, no side effects) — not the
  human-visible path. State this in the test file.
- **`startIn` is best-effort**: if the stored handle's permission has lapsed or
  the folder has moved/been deleted, Chromium may ignore `startIn` and open the
  dialog at a default location. That is acceptable degradation; the remedy for a
  genuinely missing folder is the existing recovery flow, not Locate.
- **Chromium-only**: Native FS + `startIn` are unavailable on Firefox/Safari and
  most mobile browsers. In practice a `nativefs` workspace can only exist where
  the API exists, but feature-detect and hide the action regardless.

## Next steps

1. Land the `native-fs` reveal helper + unit tests.
2. Add the command definition and core handler + unit tests.
3. Wire the settings menu item (gated to nativefs + supported) and strings.
4. Add the settings-workspaces E2E and run `pnpm local-ci-check`.
5. Open the PR; link it and any tracking issue back into this plan's
   frontmatter.
