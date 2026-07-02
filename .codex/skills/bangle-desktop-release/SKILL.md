---
name: bangle-desktop-release
description: Build, test, package, and release the Bangle.io Electron desktop app. Use when working on desktop nightlies, stable desktop releases, Electron smoke tests, updater artifacts, or macOS signing/notarization.
---

# Bangle Desktop Release

Use the root scripts as the source of truth. Do not duplicate release logic in
the skill.

## Commands

Run from the repository root:

```bash
pnpm desktop:build
pnpm desktop:open
pnpm desktop:ci
pnpm desktop:dist -- --channel nightly --version <version>
pnpm desktop:dist -- --channel latest --version <version>
pnpm desktop:release:stable -- --version X.Y.Z
```

For local Electron UI verification:

```bash
pnpm desktop:open
```

`desktop:release:stable` owns stable versioning, validation, committing,
tagging, and pushing. If a user asks for a stable desktop release, use that
command rather than manually recreating its steps.

## Required Checks

Before treating desktop release work as complete, run:

```bash
pnpm lint:ci
pnpm test:ci
pnpm build
pnpm desktop:ci
pnpm local-ci-check
```

For UI-affecting changes, also use a local Electron smoke through the app UI and
report any exact failure.
