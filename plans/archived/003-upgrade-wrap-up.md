---
title: Upgrade Wrap-up
status: complete
type: plan
archived: true
created: 2026-06-14
updated: 2026-06-14
owner: mixed
related_prs: []
related_issues: []
---

# Upgrade Wrap-up

## Summary

Finish the cleanup left after the dependency modernization and TypeScript 7
`tsgo` migration. The broad dependency modernization and initial `tsgo`
migration are complete and archived; this plan tracks only the remaining
compatibility shims and follow-up hardening needed to make the upgraded
toolchain less special-cased.

## Current Status

- [x] Dependency modernization plan archived in
  `plans/archived/001-dependency-update-modernization.md`.
- [x] TypeScript 7 `tsgo` investigation archived in
  `plans/archived/002-typescript-7-tsgo-investigation.md`.
- [x] Production deploy verified for `a31a078a` at
  `https://app.bangle.io/?deployCheck=a31a078a`.
- [x] Remove or replace the `@bangle.io/config-template` `paths` shim in
  `tsconfig.tsgo.json`.
- [x] Confirm the `@playwright/experimental-ct-core>vite` override cannot be
  removed yet and defer removal until Playwright CT supports the repo's Vite
  line.
- [x] Migrate root `tsconfig.json` away from `moduleResolution: "node"` to the
  final supported resolver after the `tsgo` setup is stable.
- [x] Remove temporary `@ts-ignore` comments that only existed for the old
  TypeScript 6/node-resolution import path.

## Remaining Scope

### Config-template exports

`tsconfig.tsgo.json` currently maps `@bangle.io/config-template` directly to
the package declaration file because the package has a top-level `types` field
but no `"types"` condition in `exports`.

Resolve by either:

- upgrading `@bangle.io/config-template` once it publishes a proper `types`
  export condition, or
- replacing the dependency/package export shape locally if this repo owns the
  package source later.

After the dependency resolves cleanly under bundler resolution, remove the
`paths` entry from `tsconfig.tsgo.json`.

Completed on 2026-06-14 by patching `@bangle.io/config-template@0.0.7` to add
the missing `types` export condition and removing all `paths` entries from
`tsconfig.tsgo.json`.

### Playwright CT Vite override

`package.json` currently pins:

```json
"@playwright/experimental-ct-core>vite": "7.3.3"
```

This keeps Playwright CT core, Tailwind's Vite plugin, and app tooling on a
single Vite 7 type/runtime line. Remove the override only after Playwright CT
supports the repo's Vite major without nested type/runtime mismatch.

Checked on 2026-06-14: latest `@playwright/experimental-ct-core@1.60.0` still
declares `vite: ^6.4.1`. Removing the override reintroduces a nested
`vite@6.4.3`, and pnpm patch/package-extension approaches do not participate in
dependency range resolution for this case. Keep the targeted override until an
upstream Playwright CT release accepts Vite 7.

### Root module resolution

The root `tsconfig.json` still uses `moduleResolution: "node"`, which
TypeScript 7 treats as the removed Node 10 resolver. `tsgo` currently uses
`tsconfig.tsgo.json` with `moduleResolution: "bundler"`.

Plan and validate a focused migration of the root config to the final resolver
once the compatibility shims above are gone or understood.

Completed on 2026-06-14 by switching the root config to
`moduleResolution: "bundler"`.

### Temporary import suppressions

Remove the temporary `@ts-ignore` comments that were retained only for older
TypeScript/node-resolution compatibility:

- `packages/tooling/browser-entry/vite.config.ts`
- `packages/tooling/e2e-tests/playwright-ct.config.ts`

Keep unrelated `@ts-expect-error` comments that intentionally assert negative
type cases in tests or document existing app typing gaps.

Completed on 2026-06-14 for the two listed config files.

## Verification

For each cleanup slice, run the smallest relevant validation first:

- `pnpm install` after package or lockfile changes.
- `pnpm run typecheck` for TypeScript config or shim changes.
- `pnpm run lint:ci` before committing.
- `pnpm build` for Vite/config changes.
- `pnpm run e2e:ci` for Playwright CT/Vite override changes.
- Playwright CLI smoke against a local preview when changes affect the app
  build or browser runtime.

Before archiving this plan, run:

- [x] `pnpm install` - passed on 2026-06-14.
- [x] `pnpm run lint:ci` - passed on 2026-06-14.
- [x] `pnpm audit --audit-level low` - passed on 2026-06-14.
- [x] `pnpm build` - passed on 2026-06-14.
- [x] `pnpm run test:ci` - passed on 2026-06-14.
- [x] `pnpm run e2e:ci` - passed on 2026-06-14.
- [x] Playwright CLI production-preview smoke - passed on 2026-06-14
  against `http://localhost:4173/`; created browser workspace
  `wrap-up-smoke`, created `wrap-up-note.md`, typed
  `Wrap-up smoke content 2026-06-14`, reloaded, and confirmed the content
  persisted.

## Out of Scope

- New dependency upgrade waves unrelated to the current shims.
- App feature work or UI redesign.
- Production deploys unless the cleanup changes are merged and explicitly ready
  for release.
