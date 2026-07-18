---
title: PWA install surface and open-in-app routing
status: active
type: plan
archived: false
archived_on:
created: 2026-07-18
updated: 2026-07-18
owner: mixed
related_prs: []
related_issues: []
---

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
   shows at most once per device.

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
- `launch_handler.client_mode: "navigate-existing"` keeps captured links and
  protocol launches routing into the existing app window instead of spawning
  new windows. Chrome 139+ also auto-captures in-scope links into the
  installed app.
- Safari/Firefox expose none of these APIs; all new UI stays hidden there.

## Scope

- Manifest: add `id`, `related_applications` (webapp, self), `launch_handler`
  (`navigate-existing`), and `protocol_handlers` (`web+bangle` →
  `/?launch=%s`).
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

## Out of scope (follow-ups)

- Service worker / offline support (largest remaining PWA gap; separate
  initiative).
- Manifest `shortcuts`, `file_handlers`, `share_target`, richer install UI
  screenshots.
- Deep-linking a specific note through the `web+bangle` protocol payload
  (current launch lands on the app's default route).
- Safari/iOS manual "Add to Dock / Home Screen" instructions in settings.

## Behavior notes and edge cases

- Manifest `id` is set to `/`, matching Chrome's computed default for the
  existing manifest (no `id` previously ⇒ default derived from `start_url`
  `/`), so existing installs keep their identity.
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

- Implement, then PR review (including an external high-effort model review).
- Follow-up plan for service worker/offline if prioritized.
