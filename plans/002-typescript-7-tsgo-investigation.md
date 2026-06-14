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

Investigate TypeScript 7's native compiler preview (`tsgo`) as a side-by-side
validation path after the TypeScript 6 upgrade has shipped and stabilized.

The first slice must not replace the `typescript` package. Keep TypeScript 6 as
the repo's canonical compiler while validating `@typescript/native-preview`
with the `tsgo` binary.

## Current Status

- [x] Dependency modernization plan completed and archived.
- [x] TypeScript 6 shipped to production in commit `e3d52a47`.
- [x] Dependency audit hardening completed in commit `0a6ad3f1`.
- [x] Add `@typescript/native-preview@beta` side-by-side.
- [x] Compare `pnpm run typecheck` with `pnpm exec tsgo -b`.
- [ ] Decide whether TypeScript 7 beta is ready for CI experimentation.

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

## Scope

- Add the native preview package on a branch.
- Run `tsgo` against the existing project references build.
- Compare diagnostics, exit codes, and timing against TypeScript 6.
- Identify tooling that still depends on the JavaScript TypeScript compiler API.
- Run broader validation only if `tsgo -b` has diagnostics parity.

## Out of Scope

- Do not replace `typescript` with TypeScript 7 in this first slice.
- Do not change `moduleResolution` or unrelated `tsconfig` behavior.
- Do not deploy a TypeScript 7 build to production.
- Do not refactor app code unless a `tsgo` compatibility issue is isolated and
  clearly necessary.

## Verification

Initial parity checks:

- `pnpm install`
- `pnpm run typecheck`
- `pnpm exec tsgo --version`
- `pnpm exec tsgo -b`

If `tsgo -b` passes:

- `pnpm run lint:ci`
- `pnpm build`
- `pnpm run test:ci`
- Playwright CLI smoke against the local app or production preview.

If package or lockfile changes are made:

- `pnpm audit --audit-level low`

## Known Risks

- TypeScript 7 beta is distributed through `@typescript/native-preview` and may
  have behavior differences from the stable TypeScript 6 compiler.
- Existing tooling may import `typescript` directly and continue to require the
  JavaScript compiler API.
- `tsgo` build mode and project references need explicit validation in this
  monorepo before any CI path changes.

## Next Steps

1. Create a focused module-resolution compatibility slice for TypeScript 7.
2. Try the smallest isolated config change that allows `tsgo -b` to start
   without weakening the TypeScript 6 compiler path.
3. Re-check the known TS 6 finding: a previous `moduleResolution: "bundler"`
   experiment exposed unrelated package export typing gaps and Vite 6/7 type
   duplication.
4. If diagnostics differ after `tsgo -b` starts, record the smallest
   reproducible incompatibility and stop before broader migration work.
5. If diagnostics match, run the broader validation gate and decide whether to
   add an experimental CI script.
