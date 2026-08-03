---
title: Versioned release train and desktop distribution
status: planned
type: plan
archived: false
archived_on:
created: 2026-08-03
updated: 2026-08-03
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/559
related_issues: []
---

# Versioned release train and desktop distribution

## Summary

Ship Bangle.io through one understandable stable/nightly release model while
offering two desktop choices:

- a signed and notarized Electron app distributed through GitHub Releases with
  user-approved automatic updates; and
- the existing installable desktop PWA, updated by deploying the matching web
  release.

Every released surface is identified by the same immutable tuple:

```text
{ channel, version, commitSha }
```

Web and Electron may have environment-specific build inputs. They do not need
byte-identical bundles, but their version, channel, and source commit must
agree. Mobile publication stays out of scope; the tuple leaves a small seam for
future native marketing versions without coupling web/desktop releases to app
store approval.

## Current status

PR #559 added the initial macOS Electron wrapper, packaging scripts, update
client, stable/nightly metadata, and persistence smoke coverage. The foundation
is useful, but no desktop release has completed:

- GitHub has no published desktop release or updater feed. All `v1.0.1`
  workflow attempts failed; the latest reached packaging and stopped because
  signing and notarization credentials were absent.
- `packages/tooling/desktop-entry/electron-builder.config.cjs` reads Electron
  from `devDependencies`, while the package declares it in `dependencies`, so
  the resolved `electronVersion` is empty.
- The current smoke launches development Electron against source-built assets,
  not the packaged `.app` that users install.
- The desktop workflow expects a `nightly` branch that does not exist.
- The local stable command commits and pushes a tag before remote packaging is
  known to work. The existing `v1.0.1` tag was moved during workflow repairs and
  must not be reused or moved again.
- Tagged Electron builds infer `dev/<tag>` as their application environment
  instead of receiving an explicit release environment.
- `CHANGELOG.md` is not a versioned product history, and GitHub release notes
  are not populated.
- Web production deployment is independent from desktop publication, so the
  deployed commit can advance while the displayed product version remains
  unchanged.
- The PWA install surface already exists. An offline service-worker app shell
  does not and is a separate product decision.

The immediate unknown is not release-note automation. It is whether a real,
signed packaged app can install, preserve local-first data, and update through
the public feed.

## Decisions

### Release identity

- Root `package.json#version` is the sole committed stable product version.
- Stable versions are exact `X.Y.Z` SemVer and use updater channel `latest`.
- Nightly versions are derived without changing tracked files:
  `X.Y.(Z+1)-nightly.YYYYMMDD.N`.
- The full commit SHA remains separate provenance and is included in runtime
  release metadata.
- Private workspace package versions remain `0.0.0` unless they are published
  independently for another reason.

### Tags and publication

- Stable tag: `vX.Y.Z`; normal GitHub Release marked latest.
- Nightly tag: `vX.Y.Z-nightly.YYYYMMDD.N`; GitHub prerelease never marked
  latest.
- A release workflow creates a tag only after required builds and verification
  pass. Pushed tags do not initiate publication.
- Published tags and assets are immutable. Recovery uses a higher hotfix or
  nightly version, never a force-moved tag or overwritten asset.
- Stable and nightly Electron apps keep distinct names, app IDs, install
  locations, profiles, and updater feeds so they can coexist.
- No unsigned macOS artifact, including a nightly, is published through GitHub
  Releases or an updater feed.

### Human gates and automation

- Stable and nightly publication initially use `workflow_dispatch` against an
  explicit commit on `main`.
- The protected publication job waits for maintainer approval after its
  downloadable release candidate is built.
- Repository policy currently requires release-candidate Playwright and
  local-first persistence smoke testing before every release. Scheduled jobs
  may eventually build candidates, but automated publication is deferred until
  that policy is explicitly changed.
- A release-preparation PR manually updates root `package.json` and the curated
  changelog. Do not add Changesets, semantic-release, Release Please, a release
  bot, or a dedicated preparation command until release frequency demonstrates
  that the manual step is costly.

### Web and PWA

- Stable web production and stable Electron releases use the same version and
  source commit.
- Released nightlies may later deploy to one fixed Cloudflare preview alias.
  Ordinary staging remains a development state, not a release channel.
- The desktop PWA receives updates through normal browser/web deployment. The
  release documentation must not promise offline use until a separate offline
  app-shell initiative provides and verifies it.
- Existing production deployment authority is retired only after the new
  stable flow completes successfully. Avoid a big-bang deployment migration.

### Scope boundaries

- macOS arm64 and x64 come first.
- Windows NSIS/signing and Linux AppImage/checksums wait until macOS update
  installation is routine.
- Do not add user-selectable Electron channel switching or a new updater state
  machine. The existing prompt/download/restart interaction is sufficient if
  the packaged update path proves reliable.
- Do not add mobile/EAS publication. A future native app may consume the
  product SemVer as its marketing version while keeping native build numbers
  and OTA compatibility independently monotonic.

## Scope

### Phase 0 — operational prerequisites

- Confirm the stable and nightly bundle IDs, Apple Developer team, signing
  owner, and release approvers.
- Provision a Developer ID Application certificate and App Store Connect API
  key in GitHub Actions secrets.
- Materialize the notarization API key into a temporary `.p8` file during CI;
  do not rely on local keychain state.
- Add a protected GitHub release environment requiring maintainer approval.
- Protect `v*` tags against updates and deletion.
- Add a credential/identity preflight that reports missing configuration before
  expensive packaging begins.

Exit criteria:

- CI can access complete signing/notarization credentials without a developer
  machine.
- The intended channel, version, and commit are visible before approval.
- Missing credentials cannot lead to a public unsigned artifact.
- Published tags cannot be moved or deleted through the normal workflow.

### Phase 1 — make the macOS artifact real

- Fix Electron version resolution and fail clearly unless it matches the pinned
  dependency.
- Add proper `.icns` product branding.
- Give release builds explicit environment, channel, version, and SHA inputs;
  do not infer release meaning from a Git branch or tag name.
- Package signed and notarized arm64/x64 DMG and ZIP artifacts.
- Launch the packaged `.app` and run the local-first persistence smoke against
  it rather than the development Electron executable.
- Verify `codesign`, Gatekeeper assessment, stapling, packaged version/app ID,
  bundled browser resources, updater YAML, ZIP paths, and blockmaps.
- Upload only private GitHub Actions release-candidate artifacts in this phase;
  do not create a public GitHub Release yet.

Exit criteria:

- Both architectures install and launch on representative Macs.
- Packaged runtime metadata contains the expected channel, version, commit, and
  production/nightly environment.
- A Browser workspace and note survive reload and packaged-app restart.
- Updater metadata names every required ZIP and blockmap.
- Ordinary CI has focused regression coverage for release metadata and builder
  configuration that does not require signing credentials.

### Phase 2 — prove nightly auto-update end to end

- Replace the nonexistent branch trigger with manual `workflow_dispatch` using
  channel `nightly` and an immutable `main` SHA.
- Resolve the existing next-patch nightly version, then build, sign, notarize,
  inspect, and upload a candidate.
- Pause at the protected publication environment for manual candidate testing.
- After approval, create the immutable nightly tag and draft prerelease, upload
  all required artifacts, and publish only when the release is complete.
- Publish two nightlies and test installation A -> B through the real GitHub
  updater.

Exit criteria:

- Nightly installs beside stable with separate identity and user-data profile.
- Nightly A discovers B, downloads it, restarts into B, and retains a note
  edited immediately before restart.
- Stable never consumes nightly metadata and nightly consumes only its own
  feed.
- Failed and rerun workflows are idempotent and never move or overwrite a
  published tag or release.
- The updater never sees a release before all referenced artifacts exist.

### Phase 3 — stable release, changelog, and web coherence

- Convert `CHANGELOG.md` into a curated user-facing document with an
  `Unreleased` section and dated version headings.
- Prepare stable releases through a normal PR that updates root version and the
  matching changelog section.
- Validate that the requested stable version equals root `package.json`, is
  newer than the last stable, is absent from tags/releases, and has a matching
  changelog heading.
- Build and verify Electron and web independently from the same
  `{channel, version, commitSha}`.
- After approval, create the immutable tag and a draft GitHub Release populated
  from the stable changelog section, then upload DMG, ZIP, blockmaps, and
  `latest-mac.yml`.
- Deploy the selected SHA/version to Cloudflare production and verify runtime
  release metadata plus the local-first persistence smoke.
- Publish the GitHub Release only after web verification succeeds.
- Once this flow succeeds, remove or disable the superseded production
  deployment trigger and update the release runbook.

Exit criteria:

- Git tag, GitHub Release, Electron version, web runtime version, Sentry
  release, channel, and commit SHA agree.
- `app.bangle.io` passes the production runtime and persistence smoke.
- The stable updater discovers only later stable versions.
- GitHub Release notes are useful to users and match the installed version.
- The installed production PWA refreshes into the released web version; offline
  behavior remains explicitly unsupported unless separately delivered.
- A failure after draft/tag creation is recoverable by rerunning against the
  same immutable tag without moving it.

### Phase 4 — released nightly web alias and routine operation

- Deploy published nightlies to one fixed Cloudflare preview alias from the
  same release identity.
- Document stable and nightly as separate distributions/URLs without building
  a web channel-switching subsystem.
- Add scheduled nightly candidates only after packaged updates are reliable;
  add scheduled publication only if release policy is explicitly amended.

Exit criteria:

- Stable and nightly URLs report their respective release identities.
- A nightly desktop PWA installed from the preview alias refreshes into the
  newly deployed nightly.
- Release operation is documented as a short, repeatable checklist with a clear
  owner, approval point, and recovery path.

## Out of scope

- Offline service-worker/PWA app-shell behavior.
- Windows and Linux packaging, signing, and update installation.
- Windows or Linux ARM builds.
- Electron channel switching inside one installation.
- Staged/percentage desktop rollouts.
- Automatic release-preparation tooling.
- Mobile binaries, store submission, EAS Update, or React Native changes.
- Renaming, deleting, or repairing the historical `v1.0.1` tag.

## Verification

Every implementation PR runs the focused tests for its changed release
contracts. Before the final release workflow update and every public release:

- `pnpm lint:ci`
- `pnpm test:ci`
- `pnpm build`
- `pnpm desktop:ci`
- `pnpm local-ci-check`
- packaged Electron smoke on the target architecture
- signature, Gatekeeper, notarization, stapling, and updater-manifest checks
- Playwright CLI against the release candidate and deployed web target,
  including Browser workspace creation, note edit, reload, restart where
  applicable, and content persistence

The first updater release is not considered proven until a real installed
nightly completes A -> B without losing the latest edit.

## Known blockers

- Apple Developer Program access and ownership of the Developer ID certificate.
- App Store Connect API key values and GitHub Actions secret provisioning.
- GitHub environment approver and immutable tag/ruleset configuration.
- Decision on the fixed nightly web hostname.
- Current production deployment remains independently owned until Phase 3
  succeeds.

## Next steps

1. Complete Phase 0's human-owned Apple and GitHub configuration.
2. Fix deterministic Electron packaging and add packaged-app verification.
3. Publish and test two signed nightlies before changing stable web authority.
4. Prepare the first proper stable version/changelog PR and exercise the
   guarded stable flow.
5. Add the nightly web alias only after the desktop update path is routine.
