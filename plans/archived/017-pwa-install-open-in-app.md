---
title: PWA install surface and open-in-app routing
status: completed
type: plan
archived: true
archived_on: 2026-07-19
created: 2026-07-18
updated: 2026-07-21
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/657
  - https://github.com/bangle-io/bangle-io/pull/665
related_issues: []
---

> DONE (2026-07-19): PR #657 delivered the install/open-in-app surfaces,
> deployment-aware manifest, protocol deep links, focus-existing launches, and
> app shortcuts. PR #665 then fixed installed-state detection for standalone
> overlay windows. Native in-place Markdown file handling was deliberately
> removed from this scope and remains a separate storage initiative. Automated
> coverage and local browser smoke testing were completed with the
> implementation; the real installed-PWA check remains part of release-time
> verification.

# PWA install surface and open-in-app routing

## Summary

Make installing and returning to the installed Bangle.io PWA a first-class,
one-click experience instead of a quiet settings-only row.

Three user-visible surfaces, all driven by one install-state snapshot:

1. Sidebar: a persistent (non-dismissable) accent "Install app" pill directly
   above the bottom Bangle.io switcher when the browser can install the app.
   Once the app is detected as installed and the user is browsing in a plain
   tab, the same pill becomes "Open in app".
2. Settings → General → App: the existing install row stays; when the app is
   installed and the page runs in a browser tab it becomes an "Open in app"
   row. When running standalone, only the version row shows.
3. A one-time alert dialog ("Open in the app?") on app open when the app is
   installed but being used from a browser tab. Dismissal is persisted, so it
   shows at most once per browser profile. It never displaces an already-open
   alert dialog; it waits for the shared alert slot to free up.

## Completion status

Completed in PR #657, with installed overlay-window detection corrected in PR
#665. Phase 1 and the retained phase 2 scope shipped. The file-handler import
experiment was removed before completion because native in-place editing needs
a separate single-file storage and save-lifecycle design. That follow-up is
explicitly out of scope for this completed plan.

## Browser API basis (verified July 2026)

- `beforeinstallprompt` (Chromium only) is already captured and deferred in
  `packages/core/app/src/common/pwa-install.ts`; `prompt()` gives the one-click
  install.
- `navigator.getInstalledRelatedApps()` detects "installed but running in a
  tab" on Chrome/Edge 140+ desktop and Android, and requires the manifest to
  list itself under `related_applications` with `platform: "webapp"` plus a
  manifest `id`.
- There is no direct JS API to launch an installed PWA. The reliable
  workaround is a manifest `protocol_handlers` entry (`web+bangle`): the
  installed app registers the scheme at install time, and navigating to
  `web+bangle://open` from the website launches the app (with a one-time
  browser confirmation). Same technique as native-app `figma://`-style links.
- `launch_handler.client_mode: "focus-existing"` plus a `launchQueue`
  consumer routes launches into the existing app window without reloading it:
  a protocol open-in-app launch only focuses the window (preserving the
  current note and any unsaved editor state), while a captured in-scope link
  applies its hash route through the hash router. Chrome 139+ auto-captures
  in-scope links into the installed app.
- Safari/Firefox expose none of these APIs; all new UI stays hidden there.

## Scope

- Manifest: add `id`, `related_applications` (webapp, self — generated with the
  deployment's absolute origin because desktop Chromium matches the resolved
  app id), `launch_handler` (`focus-existing`), and `protocol_handlers`
  (`web+bangle` → `/?launch=%s`).
- Extend `pwa-install.ts` module state with an installed-related-app probe,
  `isInstalledOnDevice` / `canOpenInApp` snapshot fields, `openInApp()`
  (protocol navigation), and boot-time cleanup of the `?launch=` query param.
- Shared `usePwaInstall()` hook for React consumers (settings, sidebar,
  dialog effect).
- Sidebar pill above the footer switcher (presentational prop on
  `@bangle.io/ui-components` `AppSidebar`, wired from `core/app`).
- Settings App section: install row (existing) + open-in-app row variant.
- One-time open-in-app alert dialog via `workbenchState.$alertDialog`, gated
  by a persisted `atomStorage` flag on `WorkbenchStateService`
  (`pwa-open-in-app-prompt-seen`).
- Unit tests for the module; Playwright E2E for the sidebar pill, settings
  variants, and the one-time dialog (installed state simulated by stubbing
  `navigator.getInstalledRelatedApps`).

## Scope (phase 2 — same branch)

- Protocol deep-linking: `openPwaApp` carries the tab's current hash route in
  the `web+bangle://open?hash=...` payload; both the boot path and the
  `focus-existing` launch-queue path apply it, so "Open in app" lands on the
  same note.
- Manifest `shortcuts`: "New note" (`/?shortcut=new-note` — lands in the most
  recently used workspace and opens the create-note dialog; falls back to the
  welcome page with zero workspaces) and "Search notes" (`/?shortcut=search`
  — opens omni-search). Unknown shortcut values are stripped and ignored.
- `PwaLaunchActions` (core/app) owns shortcut intents; the pwa-install
  module parses launches and applies deep-link hashes itself.
- REMOVED (was implemented, then dropped by maintainer decision): manifest
  `file_handlers` with an import-by-copy flow. Copying an OS-opened `.md`
  file into a workspace is not the product behavior we want — opening the
  file natively (editing the source file in place, with write-back through
  the launch-queue `FileSystemFileHandle`) is. In-place editing needs a
  single-file storage story (adapter + save lifecycle + permission restore),
  so it is a follow-up, likely alongside the NativeFS provider work.

## Out of scope (follow-ups)

- Service worker / offline support (largest remaining PWA gap; separate
  initiative; deliberately deferred).
- Manifest `share_target`, richer install UI screenshots.
- Safari/iOS manual "Add to Dock / Home Screen" instructions in settings.
- Manifest `file_handlers` with native in-place `.md` editing (write-back to
  the source file via the launch-queue handle). Requires a single-file
  storage adapter; see the REMOVED note in phase 2.

## Behavior notes and edge cases

- Manifest `id` is set to `/`, matching Chrome's computed default for the
  existing manifest (no `id` previously ⇒ default derived from `start_url`
  `/`), so existing installs keep their identity.
- Installed-app detection (`getInstalledRelatedApps`) must be verified with a
  real Chromium install. The build emits the canonical `https://app.bangle.io/`
  app id for production and the `CF_PAGES_URL` origin for Cloudflare previews,
  so both production and preview installs can be detected from their own tabs.
  Non-production Cloudflare builds fail loudly when `CF_PAGES_URL` is missing.
- The runtime probe only accepts related applications whose URL matches the
  current origin: a production install never lights up "Open in app" on
  staging, previews, or a dev server. Known limitation: Cloudflare's unique
  per-deployment URLs (as opposed to the stable branch aliases baked into the
  manifest) are not listed, so tabs on those URLs cannot self-detect.
- `promptPwaInstall` is guarded against reentrancy (sidebar pill and settings
  button share one deferred prompt event).
- Install pill and dialog only appear when the underlying signal exists, so
  unsupported browsers (Safari/Firefox) and Chromium < 140 degrade to the
  previous quiet behavior.
- `openInApp()` only renders when installation was actually detected; if the
  protocol handler is somehow unregistered the navigation is a no-op with a
  browser message, and the web app keeps working.
- The one-time dialog is marked seen on both accept and dismiss paths.

## Verification

- `pnpm lint:ci`, `pnpm test:ci`, `pnpm build`, `pnpm e2e:ci`.
- Committed Playwright coverage: sidebar install pill (synthetic
  `beforeinstallprompt`), settings install/open rows, one-time dialog + reload
  persistence of the seen flag.
- Manual (release-time): real Chrome install → confirm pill flips to
  "Open in app" in a tab, protocol launch opens the standalone window.

## Next steps

- No remaining work is required for this plan.
- Create separate plans for service worker/offline support or native in-place
  Markdown file handling if either is prioritized.
