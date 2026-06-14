---
title: TypeScript 7 tsgo Investigation
status: active
type: plan
archived: false
created: 2026-06-14
updated: 2026-06-14
owner: mixed
related_prs: []
related_issues: []
---

# TypeScript 7 tsgo Investigation

## Summary

Migrate Bangle.io's canonical typecheck path to TypeScript 7's native compiler
preview (`tsgo`) after the TypeScript 6 upgrade shipped and stabilized.

The repo should use `@typescript/native-preview` for `pnpm run typecheck`.
The JavaScript `typescript` package should not remain a root dev dependency
unless a tool proves it needs the compiler API directly.

## Current Status

- [x] Dependency modernization plan completed and archived.
- [x] TypeScript 6 shipped to production in commit `e3d52a47`.
- [x] Dependency audit hardening completed in commit `0a6ad3f1`.
- [x] Add `@typescript/native-preview@beta` side-by-side.
- [x] Compare `pnpm run typecheck` with `pnpm exec tsgo -b`.
- [x] Decide whether TypeScript 7 beta is ready for CI experimentation.
- [x] Make `tsgo` the canonical `pnpm run typecheck` path.
- [x] Remove root `typescript` dev dependency.

Initial result on 2026-06-14:

- `@typescript/native-preview@beta` resolved to `7.0.0-dev.20260421.2`.
- `pnpm run typecheck` passed with TypeScript 6.
- `pnpm exec tsgo --version` returned `Version 7.0.0-dev.20260421.2`.
- `pnpm exec tsgo -b` failed before type-checking with:
  `tsconfig.json(17,25): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.`
- The current blocker is the repo's root `moduleResolution: "node"` setting,
  which TypeScript 7 treats as the removed Node 10 resolver. Do not add
  experimental CI until a focused module-resolution compatibility branch is
  validated.

Migration research notes:

- Microsoft's TypeScript 7 beta guidance says to install
  `@typescript/native-preview@beta` and run the `tsgo` binary side-by-side
  with TypeScript 6 during transition.
- Microsoft's TypeScript 7 progress notes state that
  `moduleResolution: "node"` / `node10` is removed in TypeScript 7 in favor of
  `bundler` or `nodenext`.
- The TypeScript Go repository describes the native compiler goal as matching
  TypeScript 6 behavior for files, module resolution, parsing, type resolution,
  and type checking, while noting that not all resolution modes are supported.

References:

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/
- https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/
- https://github.com/microsoft/typescript-go

Compatibility slice result on 2026-06-14:

- Added `tsconfig.tsgo.json` extending the root config with
  `moduleResolution: "bundler"`.
- Added `tsgo`-only `paths` for `@bangle.io/config-template` because the
  package has a top-level `types` field but no `"types"` condition in
  `exports`, which `bundler` resolution respects.
- Added `tsgo`-only `paths` for `vite` to document the intended Vite 7 type
  identity, though Playwright's nested Vite resolution still required
  dependency alignment.
- Added a targeted pnpm override:
  `@playwright/experimental-ct-core>vite: 7.3.3`, so Playwright CT core,
  Tailwind's Vite plugin, and app tooling agree on Vite 7 types/runtime.
- Wrapped `packages/tooling/browser-entry/vite.config.ts` in Vite
  `defineConfig` to prevent the default export from leaking Sentry plugin
  private types under `tsgo` declaration analysis.
- Flattened `tailwindcss()` in
  `packages/tooling/e2e-tests/playwright-ct.config.ts` from
  `plugins: [tailwindcss()]` to `plugins: tailwindcss()`.
- Kept temporary `@ts-ignore` comments on ESM package imports that older
  TypeScript/node-resolution tooling could not resolve. These should be
  removed once all typechecking paths use `tsgo`/bundler-compatible resolution
  cleanly.
- `pnpm exec tsgo -b tsconfig.tsgo.json` now passes.
- `pnpm run typecheck` now runs `tsgo -b tsconfig.tsgo.json` and passes.
- Removed root `typescript` dev dependency. `pnpm why typescript` still shows a
  transitive peer resolution through Vitest/MSW tooling, but the project no
  longer declares TypeScript 6 directly.
- After removing root `typescript`, validation passed with
  `pnpm run typecheck`, `pnpm run lint:ci`, `pnpm audit --audit-level low`,
  `pnpm build`, `pnpm run test:ci`, and `pnpm run e2e:ci`.
- Broader validation passed with `pnpm audit --audit-level low`,
  `pnpm run lint:ci`, `pnpm build`, `pnpm run test:ci`, and
  `pnpm run e2e:ci`.
- Playwright CLI production-preview smoke passed against
  `http://localhost:4173/?tsgoCheck=d75e17d`:
  - Created Browser workspace `TSGO Smoke d75e17d`.
  - Created note `tsgo-smoke.md`.
  - Typed `TSGO preview smoke d75e17d persisted content.`
  - Opened omni/search UI.
  - Reload confirmed the workspace, note, and exact editor content persisted.
  - Console after reload had one local-preview-only Sentry ingest `403` error
    from `https://o573373.ingest.us.sentry.io/.../envelope/`, with zero
    warnings.
- After making `tsgo` canonical and removing root `typescript`, Playwright CLI
  production-preview smoke passed again against
  `http://localhost:4173/?tsgoCanonical=ef16dfb`:
  - Created Browser workspace `TSGO Canonical ef16dfb`.
  - Created note `tsgo-canonical.md`.
  - Typed `Canonical tsgo smoke ef16dfb persisted content.`
  - Opened omni/search UI.
  - Reload confirmed the workspace, note, and exact editor content persisted.
  - Console after reload had one local-preview-only Sentry ingest `403` error
    from `https://o573373.ingest.us.sentry.io/.../envelope/`, with zero
    warnings.

Decision:

- `tsgo` is now the canonical typecheck path for this branch.
- The repo no longer keeps `typescript@6` as a root dev dependency.
- Do not add a separate non-blocking `tsgo` CI job; the existing `lint` job
  already runs `pnpm run lint:ci`, which runs `pnpm run typecheck`, which now
  uses `tsgo`.

## Scope

- Add the native preview package on a branch.
- Run `tsgo` against the existing project references build.
- Identify tooling that still depends on the JavaScript TypeScript compiler API.
- Make the repo's canonical typecheck script use `tsgo`.
- Remove the root JavaScript `typescript` dev dependency if validation passes.

## Out of Scope

- Do not deploy a TypeScript 7 build to production.
- Do not refactor app code unless a `tsgo` compatibility issue is isolated and
  clearly necessary.

## Verification

Initial parity checks:

- `pnpm install`
- `pnpm run typecheck`
- `pnpm exec tsgo --version`
- `pnpm run lint:ci`
- `pnpm build`
- `pnpm run test:ci`
- `pnpm run e2e:ci`
- Playwright CLI smoke against the local app or production preview.

If package or lockfile changes are made:

- `pnpm audit --audit-level low`

## Known Risks

- TypeScript 7 beta is distributed through `@typescript/native-preview` and may
  have behavior differences from the stable TypeScript 6 compiler.
- Existing tooling may import `typescript` directly and continue to require the
  JavaScript compiler API even though app typechecking is now handled by
  `tsgo`.

## Next Steps

1. Track replacement/removal of the `@bangle.io/config-template` path mapping
   when that package publishes a `types` export condition.
2. Track removal of the Playwright CT Vite override when Playwright CT supports
   Vite 7 directly.
3. Plan a separate root `moduleResolution` migration away from `"node"` after
   the TS 7 experiment is stable.
