# Electron Desktop Release

Bangle.io desktop is a thin Electron wrapper around the existing Vite browser
app. It uses the custom origin `bangle://app/` so IndexedDB and localStorage stay
on one stable origin across app updates.

## Local Commands

Run from the repository root:

```bash
pnpm desktop:build
pnpm desktop:open
pnpm desktop:ci
pnpm desktop:dist -- --channel nightly --version 1.0.1-nightly.20260701.12
pnpm desktop:release:stable -- --version 1.0.1
```

`pnpm desktop:build` builds `packages/tooling/browser-entry/dist` and the
Electron `main.cjs`/`preload.cjs` files.

`pnpm desktop:open` builds the browser and Electron entry, then opens the local
Electron app against the built assets.

`pnpm desktop:ci` runs desktop unit tests, rebuilds the desktop wrapper, and on
macOS launches Electron against a temporary user-data directory. The smoke test
creates a Browser workspace and note, reloads, restarts Electron, and verifies
the note content persists.

`pnpm desktop:dist` packages macOS `.dmg`, `.zip`, and updater YAML artifacts
with `electron-builder`. Stable versions must be `X.Y.Z`; nightly versions must
be `<next-stable>-nightly.YYYYMMDD.<runNumber>`.

`pnpm desktop:release:stable` is the source of truth for stable releases. It
requires a clean git state, updates the root `package.json` version, runs
`pnpm local-ci-check`, builds and smokes a local release candidate, requires a
manual confirmation prompt, commits `chore: release vX.Y.Z`, tags `vX.Y.Z`, and
pushes the branch and tag.

## Release Metadata

`BANGLE_RELEASE_VERSION` overrides the root `package.json` version during CI
builds. The desktop app and the browser build use that value for app metadata
and runtime release display.

Update channels are derived from the version:

- `X.Y.Z` -> `latest`
- `X.Y.Z-nightly.YYYYMMDD.N` -> `nightly`

Nightly builds use product name `Bangle.io Nightly`; stable builds use
`Bangle.io`.

## GitHub Actions

`.github/workflows/desktop-release.yml` publishes releases:

- Pushing `nightly` resolves a nightly version, runs preflight checks, builds
  macOS artifacts, and publishes a prerelease GitHub Release with
  `make_latest=false`.
- Pushing tag `vX.Y.Z` validates that the tag matches the root package version,
  runs preflight checks, builds signed/notarized macOS artifacts, and publishes
  a stable GitHub Release with `make_latest=true`.

GitHub Releases are the `electron-updater` feed for both `latest` and
`nightly`.

## Signing And Notarization

Stable releases fail before packaging unless signing and notarization
credentials are present.

Signing accepts either:

- `CSC_LINK` and `CSC_KEY_PASSWORD`
- `CSC_NAME`

Notarization accepts any electron-builder-supported credential set:

- `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`
- `APPLE_KEYCHAIN` and `APPLE_KEYCHAIN_PROFILE`

Nightlies attempt signing/notarization when those secrets exist. If signing
secrets are absent, nightlies publish unsigned test/download artifacts.

## Manual Stable Checklist

```bash
pnpm install
pnpm desktop:release:stable -- --version X.Y.Z
```

During the command's manual gate, open the generated app from
`packages/tooling/desktop-entry/release/latest`, create a Browser workspace and
note, edit it, restart the app, and confirm the note persists. Then type the
requested confirmation phrase in the terminal.
