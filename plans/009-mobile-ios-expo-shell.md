---
title: iOS mobile app via Expo shell + WebView
status: active
type: plan
archived: false
archived_on:
created: 2026-07-02
updated: 2026-07-12
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/567
related_issues: []
---

# iOS mobile app via Expo shell + WebView

## Summary

Ship a Bangle.io iOS app with one shared codebase by wrapping the existing
web app in a thin Expo (React Native) shell, mirroring how
`packages/tooling/desktop-entry` wraps the browser build for Electron. The
shell is a single full-screen WKWebView (`react-native-webview`) plus a small
native bridge that grows over time. Build, signing, TestFlight, and App Store
submission run through Expo's EAS service: EAS Build profiles, EAS-managed
credentials, and `eas submit`.

Decisions made (2026-07-02, with Kushan):

- Architecture: Expo shell + WebView (not Capacitor, not a native RN rewrite).
- Deploy service: EAS Build + EAS Submit (paid, hands-off signing).
- Apple Developer account: deferred (2026-07-02) — M0 device testing uses
  Apple's free personal-team provisioning via local Xcode builds
  (`expo run:ios --device`; installs expire after 7 days). The paid program
  + EAS device builds + TestFlight come once the app feels stable.
- First milestone ships browser-storage (IndexedDB) workspaces only; the
  Native FS workspace type stays hidden (the create-workspace dialog already
  disables it when `supportsNativeBrowserFs()` is false).

## Why this shape

- The web app already runs at 390x844; ProseMirror cannot run in React
  Native, so any "native" rewrite still ends with the editor in a WebView.
- Platform coupling is already behind DI seams
  (`packages/core/initialize-services`): file storage is a registry keyed by
  workspace type, cross-tab events degrade to an in-memory channel, and the
  router/error services work in WKWebView.
- The only hard WKWebView blocker is the File System Access API
  (`showDirectoryPicker`), which only affects the NativeFS workspace type.
- A maintainer-provided reference app (private) already proves the EAS +
  pnpm-monorepo + GitHub Actions pipeline; we reuse its variant scheme
  (dev/preview/prod bundle IDs, EAS profiles, fingerprint PR builds)
  without its full-native UI architecture.

## Milestones

PR #567 merged the M0 repository scaffolding: the Expo/WebView package, app
variants, EAS profiles, and manual GitHub workflow. M0 is not complete until the
human-owned account/provisioning steps below put the app on a physical phone.
M1-M3 remain unstarted.

### M0 — pipeline end-to-end (this plan's exit criterion: app on a phone)

1. `packages/tooling/mobile-entry`: Expo app, no committed `ios/` dir
   (Continuous Native Generation), WebView pointed at a configurable URL —
   default `https://app.bangle.io`, overridable via `EXPO_PUBLIC_BANGLE_WEB_URL`
   (e.g. LAN Vite dev server for the dev loop).
2. Free local device install (no paid account): CocoaPods installed
   locally, `expo prebuild --platform ios` verified, then
   `APP_VARIANT=development pnpm exec expo run:ios --device` with a
   personal-team Apple ID in Xcode. 7-day install lifetime; rebuild to
   renew. See the package README for the phone-side steps.
3. When stable: Apple Developer enrollment → EAS project init
   (`eas init`) → `eas build --profile preview -p ios` → `eas submit` →
   TestFlight. (EAS cloud builds for physical devices require the paid
   program, which is why M0 device installs are local Xcode builds.)
4. Known-accepted M0 gaps: no offline (remote URL + no service worker), no
   Files-app storage, desktop-oriented chrome in places, App Store review
   (guideline 4.2 "minimum functionality") not yet addressed — TestFlight
   only.

### M1 — bundled web assets (offline, stable origin)

- Bundle the `browser-entry` Vite build into the app and serve it to the
  WebView from a fixed origin. Options, in preference order: embedded static
  server on a fixed port; or a tiny Expo module wrapping
  `WKURLSchemeHandler` (the piece Capacitor gives for free). Origin
  stability matters: IndexedDB data is keyed by origin, so changing origins
  orphans user notes — pick once, keep forever, and provide an export path
  before any migration.
- Wire the web build step into the EAS build (`prebuildCommand` /
  npm hook) so `pnpm build` output ships inside the binary.

### M2 — native feel + durable storage

- Safe-area insets, keyboard handling for the editor, status bar, haptics,
  external links via SFSafariViewController, overscroll behavior.
- `window.bangleMobile` bridge (postMessage protocol) exposed from the shell;
  a new platform service package (parallel to
  `packages/platform/service-platform`) implementing
  `BaseFileStorageProvider` over the bridge to `expo-file-system` →
  real `.md` files in the app Documents folder (Files app visible, iCloud
  backed, immune to WKWebView data eviction). Registered as a new workspace
  storage type in `initialize-services`.
- Mobile E2E smoke: Playwright cannot drive the app; use Maestro or EAS
  build + manual smoke checklist until then. The web-side behavior remains
  covered by the existing Playwright suites at mobile viewport.

### M3 — updates + App Store

- OTA: EAS Update for shell JS; bundled web assets ride along as assets, or
  M1's server fetches a pinned web bundle. Decide runtimeVersion policy then.
- App Store review readiness: native storage (M2), app icon/splash,
  privacy manifest/nutrition labels, guideline 4.2 justification (offline
  local-first notes, native file storage, share sheet).

## Scope (M0, this repo)

- New package `packages/tooling/mobile-entry` (env `browser`, kind `app`,
  no workspace runtime deps).
- No changes to core/platform/ui packages.
- `.github/workflows/mobile-eas.yml`: manual-dispatch EAS build, gated on
  `EXPO_TOKEN` secret (a PR-label-triggered flow can come later).

## Out of scope (M0)

- Android (config carries the fields, but no testing or store work).
- Any change to storage services, editor, or workspace types.
- App Store (not TestFlight) submission.

## Verification

- `pnpm lint:ci`, `pnpm test:ci` pass with the new package.
- `pnpm --filter @bangle.io/mobile-entry exec expo config` resolves all three
  variants; `expo export --platform ios` bundles the shell JS.
- Real verification is on-device: dev client loads app.bangle.io, create a
  browser workspace, write a note, kill app, relaunch, note persists
  (IndexedDB under the app's WKWebView data store).

## Known blockers

- Apple Developer Program enrollment (human; ~1–2 days).
- Expo account + `eas init` (human; sets `EAS_PROJECT_ID`/owner).
- EXPO_TOKEN secret needed before the GitHub workflow can run.

## Next steps

1. (human) Enroll Apple Developer Program; create Expo account/org.
2. (human) `eas init` in `packages/tooling/mobile-entry`, set
   `EAS_PROJECT_ID`, run `eas build --profile development -p ios`.
3. Install dev client on phone, iterate with `pnpm --filter
   @bangle.io/mobile-entry dev`.
4. After enrollment: preview build → `eas submit` → TestFlight.
5. Start M1 (bundled assets / fixed origin) — decision needed on embedded
   server vs custom URL scheme module.
