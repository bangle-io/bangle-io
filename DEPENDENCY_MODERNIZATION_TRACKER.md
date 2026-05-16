# Dependency Modernization Tracker

This tracker is the durable handoff for dependency modernization work in
`bangle-io-2`. Keep it high-level: use it to choose slices, record outcomes, and
avoid re-discovering the same verification gates. Do not treat the package names
below as an exact "latest version" prescription; always re-check the ecosystem at
the time of the update.

## Current Status

- `main` currently includes the merged Vitest 4 work from PR #298
  (`chore(deps): update vitest to v4`), after the Biome v2 and browser Vite
  toolchain upgrades.
- The existing modernization plan lives at
  `plans/dependency-update-modernization-plan.md` and should remain the phase
  source of truth for the already-completed Biome, Vite, and Vitest work.
- Historical local/remote branches still visible at the time this tracker was
  created include `dependency-update-phase-1`, `dependency-update-phase-2`,
  `dependency-update-phase-3-biome`, `dependency-update-vite`, and
  `deps/vitest-4`.
- Active or stale Dependabot context may exist for Storybook, Jest, Playwright,
  Chromatic, and GitHub Actions updates. Treat those branches as useful signal,
  not as automatically mergeable work.
- This file is documentation only. Dependency manifests and `pnpm-lock.yaml`
  should change only in the actual modernization PRs.

## Dependency Surfaces

- Package management: PNPM workspace, root `packageManager`, root `pnpm`
  overrides, `onlyBuiltDependencies`, supported architecture constraints, and
  `pnpm-lock.yaml`.
- Workspace graph: `packages/core/*`, `packages/platform/*`,
  `packages/shared/*`, `packages/ui/*`, `packages/js-lib/*`, and
  `packages/tooling/*`, with layer rules enforced by custom validation.
- Browser app and build toolchain: Vite, `@vitejs/plugin-react`,
  `vite-plugin-html`, Tailwind v4 stack, PostCSS/autoprefixer, React 19, React
  DOM, Sentry browser/Vite integration, and browser entry scripts.
- UI system: ShadCN/Radix packages, `cmdk`, `lucide-react`, `sonner`,
  `class-variance-authority`, `clsx`, `tailwind-merge`, drag-and-drop packages,
  and Storybook consumers.
- Editor stack: `@bangle.dev/*`, ProseMirror packages, `orderedmap`,
  `@floating-ui/dom`, editor React bindings, and Markdown serialization paths.
- App state and storage: Jotai, `jotai-effect`, IndexedDB/native file-system
  helpers, `fake-indexeddb`, browser utility packages, date/routing helpers, and
  local-first persistence flows.
- Test stack: Vitest 4, `@vitest/browser`, coverage, `happy-dom`, `jsdom`,
  Testing Library, Jest remnants, `@swc/jest`, Playwright E2E, Playwright
  component tests, and browser installation.
- Tooling scripts: Bun-powered custom scripts under
  `packages/tooling/custom-scripts/scripts/`, syncpack, plop, execa, globby,
  fs-extra, p-map, zod, prettier, ts-node, tsx, and TypeScript project
  references.
- CI and automation: `.github/workflows/node.js.yml`, `.github/dependabot.yml`,
  Node 22 CI, Bun setup, Biome setup, Playwright container image, GitHub Actions
  versions, and Dependabot daily npm/actions updates.

## Phased Checklist

### Phase 0: Baseline

- [ ] Confirm branch, remote, and latest `main`.
- [ ] Capture `pnpm outdated -r` output or equivalent dependency inventory.
- [ ] Run `pnpm install`.
- [ ] Run `pnpm run custom-validation`.
- [ ] Run `pnpm run lint:ci`.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build`.
- [ ] Run `pnpm run test:ci`.
- [ ] Run `pnpm run e2e:ci` if the environment has Playwright browsers.
- [ ] Start the app with `pnpm start` and record the manual browser smoke
  baseline.
- [ ] Record known warnings, skipped checks, environment constraints, and the
  exact commit tested.

### Phase 1: Safe Refresh

- [ ] Patch/minor refreshes only; avoid major jumps.
- [ ] Keep same-family versions aligned across workspaces.
- [ ] Prefer low-risk UI helper, type package, testing helper, and utility
  updates.
- [ ] Include only direct dependency fallout fixes.
- [ ] Run the baseline automated gates plus the core Playwright browser smoke.
- [ ] Update this tracker with the PR number, changed families, and skipped
  gates.

### Phase 2: Moderate Risk

- [ ] Update one moderate surface at a time when possible: Playwright, Tailwind
  helpers, Sentry patch/minor, Storybook v8 patch/minor, Wouter/date/storage
  helpers, or editor patch/minor families.
- [ ] Reinstall Playwright browsers after Playwright package changes.
- [ ] Run E2E and component tests for UI, editor, and storage-facing changes.
- [ ] Add responsive smoke checks for mobile and desktop widths.
- [ ] Stop and split if a dependency change requires unrelated app refactors.

### Phase 3: Aggressive Breaking

- [ ] Treat each breaking family as its own branch/PR unless the update is
  mechanically coupled.
- [ ] Keep migration commits reviewable: manifest/lockfile update, compile
  fixes, test fixes, and docs/checklist updates.
- [ ] Prefer package-family slices over broad "update everything" PRs.
- [ ] Re-run the full verification matrix before merging each family.
- [ ] Record explicit rollback or pin decisions when a latest major is not yet
  viable.

Candidate aggressive families:

- [ ] TypeScript major upgrade and project-reference fallout.
- [ ] Storybook latest major, including React/Vite integration, addons,
  Chromatic, and test runner.
- [x] Jest 30 family or removal plan if Jest is no longer needed.
- [x] DOM test environment major update for `happy-dom` and `jsdom`.
- [x] Tailwind/CSS support stack patch-minor refresh.
- [x] Zod major upgrade for custom scripts and validation schemas.
- [x] Sentry major alignment across browser, tracing, and Vite plugin packages.
- [x] `lucide-react` and icon/UI package major or large minor updates.
- [x] Playwright major or large-version jumps, including container image and
  component test behavior.
- [ ] GitHub Actions major updates for checkout, setup-node, upload-artifact,
  cache, setup-bun, and setup-biome.
- [ ] React ecosystem updates only when React, React DOM, types, Testing
  Library, Storybook, and Playwright CT compatibility line up.
- [ ] ProseMirror and `@bangle.dev/*` updates only with editor Markdown,
  selection, history, list behavior, and persistence smoke coverage.

### Phase 4: Final Hardening

- [ ] Run the complete verification matrix on a clean checkout.
- [ ] Confirm no duplicate direct dependency versions violate custom validation.
- [ ] Confirm no cross-layer workspace imports were introduced.
- [ ] Confirm production build config and deployment branch assumptions still
  hold.
- [ ] Run manual Playwright browser smoke against local production preview.
- [ ] Run supply-chain review and record any accepted advisories.
- [ ] Update this tracker and the modernization plan with final status.

## Standing Rules

- Do not change dependency manifests or `pnpm-lock.yaml` in tracker-only PRs.
- Run commands from the repo root.
- Import internal packages by `@bangle.io/*` package name, not relative package
  paths or package `src` paths.
- Keep dependency changes scoped by family and risk level.
- Preserve the workspace hierarchy and `bangleWorkspaceConfig.allowedWorkspaces`
  rules.
- Keep user-visible strings behind the global `t` function; do not import `t`.
- Avoid `any`, unsafe assertions, broad lint suppressions, and mock-heavy tests.
- Do not mix UI redesign, feature work, or storage rewrites into dependency PRs.
- Prefer real verification over snapshot churn. Snapshot updates should be an
  explicit, reviewed part of the PR.
- When a latest version is blocked, document the reason and pin intentionally.

## Next Recommended Aggressive Slice

As of 2026-05-16, after refreshing `main` to PR #298 and capturing
`pnpm outdated -r --format json`, the recommended next breaking-major PR is
Zod 4 only.

- [x] Branch: `deps/zod-4` (completed on shared branch
  `deps/aggressive-modernization`).
- [x] PR title: `chore(deps): update zod to v4`.
- [x] Scope: `packages/tooling/custom-scripts/package.json`, `pnpm-lock.yaml`,
  and direct Zod 4 fallout in `packages/tooling/custom-scripts/config.ts` or its
  schema consumers. No code compatibility edits were needed.
- [x] Do not mix Storybook, TypeScript, Jest, Sentry, Playwright, Tailwind,
  React, Jotai, ProseMirror, or unrelated custom-script dependency updates.
- [x] Stop if Zod 4 requires broader custom-validation redesign, repo-wide
  package metadata edits, or type fallout outside `packages/tooling/custom-scripts`.
- [x] Before starting, re-run the outdated inventory and confirm Zod remains a
  small isolated major update.

## Tailwind/CSS Support Stack Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is the Tailwind/CSS support stack refresh.

- [x] Scope: `tailwindcss` 4.2.4 -> 4.3.0, `@tailwindcss/vite` 4.2.4 ->
  4.3.0, `postcss` 8.5.12 -> 8.5.14, `autoprefixer` 10.4.21 -> 10.5.0, and
  `tailwind-merge` 3.5.0 -> 3.6.0.
- [x] Manifests: `packages/tooling/browser-entry/package.json`,
  `packages/tooling/e2e-tests/package.json`,
  `packages/tooling/storybook/package.json`,
  `packages/tooling/custom-scripts/package.json`,
  `packages/ui/ui-components/package.json`, and
  `packages/ui/ui-misc/package.json`.
- [x] Keep Vite, `@vitejs/plugin-react`, Storybook, React/React DOM,
  `lucide-react`, Jotai, Sentry, Jest/jsdom/happy-dom, TypeScript, Node types,
  and unrelated dependencies out of scope.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run focused CSS/build validation and record any skipped checks.

Verification on 2026-05-16:

- `pnpm install --frozen-lockfile` passed with pnpm 10.12.1; Storybook 8/Vite 7 peer warnings remain.
- `pnpm run custom-validation` equivalent passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because local `bun` is not installed on PATH.
- `pnpm run lint:ci` equivalent gates passed manually: custom validation, global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; targeted `simple-workspace-creation-worflow.e2e.ts` passed when run through the package script.
- Browser smoke passed on local dev server at `http://localhost:5173`: title/welcome screen, Browser workspace creation, note creation, editor typing, reload persistence, command/search UI, and console review.
- Responsive smoke passed with Playwright headless checks at `390x844` and `1440x1000`; mobile and desktop rendered the welcome screen and expected controls. Baseline local console noise remained: Radix dialog title warnings on mobile and a Sentry 403 in local dev.
- `pnpm --filter "@bangle.io/storybook" run build-storybook` remains blocked before CSS processing by `.storybook/main.ts` evaluation: `ReferenceError: require is not defined in ES module scope` from `packages/tooling/env-vars/index.ts`.

## Repo Tooling Patch/Minor Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is the repo tooling patch/minor refresh.

- [x] Scope: `@biomejs/biome` 2.4.13 -> 2.4.15, `@types/bun` ^1.3.13 ->
  ^1.3.14, `fs-extra` ^11.3.4 -> ^11.3.5, `prettier` 3.5.3 -> 3.8.3, and
  `tsx` ^4.21.0 -> ^4.22.0.
- [x] Manifests: root `package.json`,
  `packages/tooling/custom-scripts/package.json`,
  `packages/tooling/plop-configs/package.json`, and
  `packages/tooling/e2e-tests/package.json`.
- [x] Keep React, Storybook/Chromatic/test-runner, Vite/`@vitejs/plugin-react`,
  Sentry, Jest/`@jest/globals`/`@types/jest`, TypeScript/`@types/node`,
  `happy-dom`/`jsdom`, `lucide-react`, `globby`, `syncpack`,
  `wait-for-expect`, `globals`, `eslint-plugin-react-refresh`, and unrelated
  dependencies out of scope.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run `pnpm install --frozen-lockfile` with the pinned pnpm/corepack path.
- [x] Run focused tooling and e2e CT checks as practical.

Verification on 2026-05-16:

- `pnpm install` passed with pnpm 10.12.1; existing cyclic workspace warnings,
  deprecated subdependency warnings, Storybook 8/Vite 7 peer warnings, and a
  Node `url.parse()` deprecation warning remain.
- `pnpm install --frozen-lockfile` passed with pnpm 10.12.1; existing cyclic
  workspace warnings and the Node `url.parse()` deprecation warning remain.
- `pnpm run custom-validation` remains blocked because `bun` is not installed on
  the specified PATH; equivalent validation passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- `pnpm exec biome ci . --diagnostic-level=error` passed with Biome 2.4.15.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; CT also
  passed during focused Codex verification.
- Direct compatibility fallout: `packages/tooling/e2e-tests/playwright-ct.config.ts`
  now unwraps the nested default export shape returned by `tsx` 4.22
  `tsImport('@bangle.io/env-vars', import.meta.url)`.

## Wait For Expect Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is the `wait-for-expect` major update.

- [x] Scope: `packages/tooling/test-utils` `wait-for-expect` `^3.0.2` ->
  `^4.0.0`.
- [x] Manifests: `packages/tooling/test-utils/package.json` and
  `pnpm-lock.yaml`.
- [x] Direct import/export fallout: no code changes needed in
  `packages/tooling/test-utils/common-opts.ts` or
  `packages/tooling/test-utils/test-service-setup.ts`; v4 still exposes a
  default export and matching `lib/index.d.ts`.
- [x] Keep Storybook/Chromatic/test-runner, Jest/`@jest/globals`/`@types/jest`,
  Sentry, TypeScript/`@types/node`, Vite/`@vitejs/plugin-react`,
  `globals`/`globby`/`syncpack`/`eslint-plugin-react-refresh`, and unrelated
  dependencies out of scope.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run `pnpm install --frozen-lockfile` with the pinned pnpm/corepack path.
- [x] Run a focused `wait-for-expect` export smoke or test-utils test.
- [x] Run custom validation via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- [x] Run `pnpm exec biome ci . --diagnostic-level=error`.
- [x] Run `pnpm run typecheck`.
- [x] Run `pnpm run build`.
- [x] Run `pnpm run test:ci`.
- [x] Run `pnpm -w run e2e:ci`.

Verification on 2026-05-16:

- `pnpm --filter @bangle.io/test-utils add wait-for-expect@^4.0.0` passed
  with pnpm 10.12.1; existing Storybook 8/Vite 7 peer warnings,
  deprecated-subdependency warnings, and Node `url.parse()` deprecation warning
  remain.
- `pnpm install` passed with pnpm 10.12.1; existing cyclic workspace warnings
  and Node `url.parse()` deprecation warning remain.
- `pnpm install --frozen-lockfile` passed with pnpm 10.12.1; existing cyclic
  workspace warnings and Node `url.parse()` deprecation warning remain.
- Direct export smoke passed through the `@bangle.io/test-utils` workspace:
  `pnpm --filter @bangle.io/test-utils exec node --input-type=module ...`.
- Focused Vitest usage check passed:
  `pnpm vitest run --configLoader runner packages/shared/base-utils/__tests__/index.spec.ts`
  (1 file / 4 tests passed).
- Custom validation passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- `pnpm exec biome ci . --diagnostic-level=error` passed.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped; existing
  React `act(...)` warnings remain in `page-ws-home.spec.tsx`.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; existing
  Vite/Storybook component-test warnings about `use client` directives and
  Storybook `eval` remain.

## Syncpack Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is the `syncpack` major update.

- [x] Scope: `packages/tooling/custom-scripts` `syncpack` `^13.0.4` ->
  `^15.1.2`.
- [x] Manifests: `packages/tooling/custom-scripts/package.json` and
  `pnpm-lock.yaml`.
- [x] Direct compatibility fallout: no code changes needed; custom validation
  passed and the only direct `syncpack` usage is the package declaration.
- [x] Keep Storybook/Chromatic/test-runner, Jest/`@jest/globals`/`@types/jest`,
  Sentry, TypeScript/`@types/node`, Vite/`@vitejs/plugin-react`,
  `globals`/`globby`/`eslint-plugin-react-refresh`, and unrelated dependencies
  out of scope.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run `pnpm install --frozen-lockfile` with the pinned pnpm/corepack path.
- [x] Run stale direct `syncpack` version search.
- [x] Run focused `syncpack --version` smoke.
- [x] Run custom validation via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- [x] Run `pnpm exec biome ci . --diagnostic-level=error`.
- [x] Run `pnpm run typecheck`.
- [x] Run `pnpm run build`.
- [x] Run `pnpm run test:ci`.
- [x] Run `pnpm -w run e2e:ci`.

Verification on 2026-05-16:

- `pnpm install` passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  existing cyclic workspace warnings, deprecated subdependency warnings, Node
  `url.parse()` deprecation warning, and Storybook 8/Vite 7 peer warnings
  remain.
- `pnpm install --frozen-lockfile` passed with the same PATH; existing cyclic
  workspace warnings and Node `url.parse()` deprecation warning remain.
- Stale direct `syncpack` search passed: no `syncpack` `^13.0.4` manifest
  declarations and no `syncpack@13.0.4` lockfile entry remain.
- Focused CLI smoke passed:
  `pnpm --filter @bangle.io/custom-scripts exec syncpack --version` reported
  `syncpack 15.1.2`.
- Custom validation passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- `pnpm exec biome ci . --diagnostic-level=error` passed.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; existing
  Vite/Storybook component-test warnings about `use client` directives and
  Storybook `eval` remain.

## DOM Test Environment Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is the DOM test environment refresh.

- [x] Scope: root `happy-dom` `^17.6.3` -> `^20.9.0` and root `jsdom`
  `^26.1.0` -> `^29.1.1`.
- [x] Manifests: root `package.json` and `pnpm-lock.yaml`.
- [x] Keep Jest, `@jest/globals`, `@types/jest`, `@swc/jest`, TypeScript,
  `@types/node`, Vite, `@vitejs/plugin-react`, Storybook, Chromatic,
  Storybook test runner, Sentry, and unrelated tooling packages out of scope.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run `pnpm install --frozen-lockfile` with the pinned pnpm/corepack path.
- [x] Run focused DOM environment tests before broader gates.

Verification on 2026-05-16:

- `pnpm install` passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  existing cyclic workspace warnings, deprecated subdependency warnings,
  Storybook 8/Vite 7 peer warnings, and the Node `url.parse()` deprecation
  warning remain.
- `pnpm install --frozen-lockfile` passed with the same PATH; existing cyclic
  workspace warnings and the Node `url.parse()` deprecation warning remain.
- Focused DOM environment Vitest files passed: 15 files / 87 tests.
- `pnpm run custom-validation` equivalent passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- `pnpm run lint:ci` equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; existing
  Playwright `NO_COLOR`/`FORCE_COLOR`, CT `use client`, sourcemap, and
  Storybook eval warnings remain.
- Direct compatibility fallout: none.

## Jest Family Removal Session

As of 2026-05-16, the next separate dependency modernization commit on
`deps/aggressive-modernization` is removal of the unused direct Jest family.

- [x] Scope: root direct devDependencies `jest`, `@types/jest`, and
  `@swc/jest`, plus `packages/tooling/custom-scripts` direct dependency
  `@jest/globals`.
- [x] Manifests: root `package.json`,
  `packages/tooling/custom-scripts/package.json`, and `pnpm-lock.yaml`.
- [x] Keep `@testing-library/jest-dom`, Storybook/Chromatic/test-runner,
  Sentry, TypeScript/`@types/node`, Vite/`@vitejs/plugin-react`, Vitest,
  Playwright, Testing Library, and unrelated dependencies out of scope.
- [x] Focused usage search excluding `node_modules`, `dist`, `build`, and
  `pnpm-lock.yaml`: no direct Jest usage found outside target manifests and
  documentation references; `@testing-library/jest-dom` usage remains through
  Vitest entrypoints.
- [x] Run `pnpm install` with the pinned pnpm/corepack path.
- [x] Run `pnpm install --frozen-lockfile` with the pinned pnpm/corepack path.
- [x] Run custom validation via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- [x] Run `pnpm exec biome ci . --diagnostic-level=error`.
- [x] Run `pnpm run typecheck`.
- [x] Run `pnpm run build`.
- [x] Run `pnpm run test:ci`.
- [x] Run `pnpm -w run e2e:ci`.
- [x] Run `git diff --check`.
- [x] Direct compatibility fallout: none.

Verification on 2026-05-16:

- `pnpm remove -w -D jest @types/jest @swc/jest` and
  `pnpm --filter @bangle.io/custom-scripts remove @jest/globals` passed with
  pnpm 10.12.1.
- `pnpm install` passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  existing cyclic workspace warnings and Node `url.parse()` deprecation warning
  remain.
- `pnpm install --frozen-lockfile` passed with the same PATH; existing cyclic
  workspace warnings and Node `url.parse()` deprecation warning remain.
- Focused Jest usage search passed for code/config scope: no direct Jest usage
  remains outside documentation references; `@testing-library/jest-dom` remains
  intentionally present and used through Vitest entrypoints.
- Transitive Jest 29 lockfile entries remain through `@storybook/test-runner`
  `0.22.1`; those are intentionally left for the Storybook/test-runner family.
- Custom validation passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- `pnpm exec biome ci . --diagnostic-level=error` passed.
- `pnpm run typecheck` passed.
- `pnpm run build` passed; Sentry auth-token and chunk-size warnings remain.
- `pnpm run test:ci` passed, 73 files / 726 passed / 1 skipped.
- `pnpm -w run e2e:ci` passed, 4 E2E tests and 5 component tests; existing
  Playwright `NO_COLOR`/`FORCE_COLOR`, CT `use client`, sourcemap, and
  Storybook eval warnings remain.
- `git diff --check` passed.

## Suggested Branch and PR Slicing

- `deps/baseline-modernization-audit`: no dependency changes; record inventory,
  gates, known warnings, and smoke notes.
- `deps/safe-refresh`: patch/minor refreshes with minimal code fallout.
- `deps/playwright-refresh`: Playwright packages, browser install, E2E/CT config,
  and container image if needed.
- `deps/storybook-major`: Storybook, addons, React/Vite Storybook integration,
  Chromatic, and Storybook test runner.
- `deps/typescript-major`: TypeScript and related types/config fixes.
- `deps/jest-30-or-remove`: Jest family upgrade or removal decision.
- `deps/zod-major`: Zod plus custom script schema updates.
- `deps/sentry-major`: Sentry browser/tracing/Vite plugin alignment.
- `deps/editor-prosemirror`: ProseMirror and `@bangle.dev/*` editor-family
  updates.
- `deps/github-actions`: GitHub Actions and CI action major updates.
- `deps/final-hardening`: cleanup, audit follow-up, docs, and final smoke notes.

For aggressive "latest most deps/devdeps" work, open a short-lived umbrella
tracking branch only if useful, but merge reviewable family PRs into `main`
instead of stacking many unrelated lockfile changes.

## Verification Matrix

| Gate | Command or action | When required | Notes |
| --- | --- | --- | --- |
| Install | `pnpm install` | Every dependency PR | Confirms lockfile, PNPM version, overrides, and build scripts. |
| Custom validation | `pnpm run custom-validation` | Every dependency PR | Checks workspace dependency declarations, layer rules, service rules, and duplicate direct versions. |
| Lint CI | `pnpm run lint:ci` | Every dependency PR | Runs custom validation, typecheck, and Biome CI. |
| Typecheck | `pnpm run typecheck` | Every dependency PR | TypeScript project references are a primary compatibility gate. |
| Build | `pnpm run build` | Every dependency PR | Browser production build through Vite. |
| Unit tests | `pnpm run test:ci` | Every dependency PR | Vitest 4 gate; run narrower tests first while iterating if useful. |
| E2E/CT install | `pnpm run e2e-install` | Playwright or fresh CI-like machines | Installs Chromium and system deps where supported. |
| E2E and CT | `pnpm run e2e:ci` | Moderate/aggressive UI, editor, build, or Playwright changes | Includes Playwright E2E and component tests. |
| Local CI sweep | `pnpm run local-ci-check` | Before final merge when practical | Runs all root `*:ci` scripts. |
| Browser smoke | `pnpm start`, then Playwright CLI/manual browser | Every phase, every aggressive PR | Verify title, welcome screen, Browser workspace, note creation, editor typing, reload persistence, and command/search UI. |
| Production preview smoke | `pnpm run preview-production` | Final hardening, Vite/build changes | Verifies production build and preview path. |
| Responsive smoke | Browser/Playwright resize to mobile and desktop widths | UI, Storybook, Tailwind, Radix, React, editor changes | Cover roughly 390x844 and 1440x1000. |
| Console review | Playwright CLI console or browser devtools | Every browser smoke | Only known non-blocking warnings should remain. |
| Supply-chain audit | `pnpm audit` or documented equivalent | Safe refresh completion, aggressive completion, final hardening | Triage advisories by reachability and runtime exposure; record accepted risk. |
| Git diff hygiene | `git diff --check` | Every PR | Catches whitespace and conflict marker issues. |

## Playwright Browser Smoke Checklist

- [ ] Open `http://localhost:4000`.
- [ ] Confirm document title is `Bangle App`.
- [ ] Confirm the welcome screen renders `Create Workspace`.
- [ ] Create a `Browser` workspace.
- [ ] Create a note.
- [ ] Type visible editor content.
- [ ] Navigate away and back through sidebar/recent note paths.
- [ ] Open omni-search or command UI and confirm it renders and accepts input.
- [ ] Reload and confirm workspace, note, and content persist.
- [ ] Check console output and record only known non-blocking warnings.
- [ ] Resize to mobile width and repeat workspace/note navigation basics.
- [ ] Resize to desktop width and confirm sidebar, editor, search, and reload
  persistence still work.

## Future Session Log Template

Copy this section for each modernization session.

### Session: YYYY-MM-DD - short description

- [ ] Branch:
- [ ] Base commit:
- [ ] Dependency family:
- [ ] PR/issue:
- [ ] Manifest/lockfile changes intended:
- [ ] Code migrations needed:
- [ ] Baseline known warnings:
- [ ] Commands run:
- [ ] `pnpm install`:
- [ ] `pnpm run custom-validation`:
- [ ] `pnpm run lint:ci`:
- [ ] `pnpm run typecheck`:
- [ ] `pnpm run build`:
- [ ] `pnpm run test:ci`:
- [ ] `pnpm run e2e-install`:
- [ ] `pnpm run e2e:ci`:
- [ ] Playwright browser smoke:
- [ ] Responsive smoke:
- [ ] Production preview smoke:
- [ ] Supply-chain audit:
- [ ] `git diff --check`:
- [ ] Skipped gates and why:
- [ ] Result:
- [ ] Follow-up:


### Session: 2026-05-16 - browser-entry ESLint helper pair upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `93f551c6`.
- [x] Dependency family: browser-entry ESLint helper pair only:
  `globals` and `eslint-plugin-react-refresh`.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `globals` `^16.2.0` to `^17.6.0`
  and `eslint-plugin-react-refresh` `^0.4.20` to `^0.5.2` in
  `packages/tooling/browser-entry/package.json`, plus `pnpm-lock.yaml`.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook/Vite peer warning, Node
  `url.parse()` deprecation warning from install tooling, Sentry auth-token and
  chunk-size build warnings, CT `use client`/sourcemap/Storybook eval warnings,
  and Playwright `NO_COLOR`/`FORCE_COLOR` warnings.
- [x] Commands run: install, frozen install, stale direct version search,
  browser-entry lint attempt, custom validation via `npm exec --package bun`,
  Biome CI, typecheck, build, test CI, e2e/CT, and `git diff --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  frozen install passed with the same PATH and `--frozen-lockfile`.
- [x] Stale direct version searches: passed; no remaining direct references to
  `globals` `^16.2.0`/`globals@16.2.0` or
  `eslint-plugin-react-refresh` `^0.4.20`/`0.4.20` were found.
- [ ] Browser-entry package lint: attempted with
  `pnpm --filter @bangle.io/browser-entry run lint`; failed before linting
  because ESLint 9 could not find `eslint.config.(js|mjs|cjs)` for the package.
- [x] `pnpm run custom-validation`: passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`
  because local `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already
  installed from prior verification on this branch.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [ ] Playwright browser smoke: not run separately; full Playwright E2E/CT gate
  passed for this focused lint-helper dependency bump.
- [ ] Responsive smoke: not run separately for this isolated lint-helper bump.
- [ ] Production preview smoke: not run for this isolated lint-helper bump.
- [ ] Supply-chain audit: not run for this isolated lint-helper bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: e2e-install, separate manual browser/responsive/
  production smoke, and audit skipped because this commit only updates the
  browser-entry ESLint helper pair; browser-entry package lint is blocked by the
  existing missing ESLint 9 flat-config setup, while repo validation, Biome,
  typecheck, build, unit tests, and E2E/CT passed.
- [x] Result: `packages/tooling/browser-entry` now specifies `globals`
  `^17.6.0` and `eslint-plugin-react-refresh` `^0.5.2`; the lockfile resolves
  to `17.6.0` and `0.5.2` respectively, with no direct compatibility fallout.
- [x] Follow-up: commit this as a separate browser-entry ESLint helper
  dependency modernization commit after review.


### Session: 2026-05-16 - globby 16 tooling upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `067c9639`.
- [x] Dependency family: `globby` only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `globby` `^14.1.0` to `^16.2.0`
  in `packages/tooling/custom-scripts/package.json` and
  `packages/tooling/storybook/package.json`, plus `pnpm-lock.yaml`.
- [x] Code migrations needed: none. `packages/tooling/custom-scripts/lib/workspace-helper.ts`
  remains compatible with `globbySync` v16; custom validation exercises the
  workspace package discovery path.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook 8/Vite 7 peer warning, Node
  `url.parse()` deprecation warning from install tooling, Sentry auth-token and
  chunk-size build warnings, Playwright `NO_COLOR`/`FORCE_COLOR` warnings, CT
  `use client`/sourcemap/Storybook eval warnings.
- [x] Commands run: install, frozen install, stale `globby` version search,
  custom validation via `npm exec --package bun`, Biome CI, typecheck, build,
  test CI, e2e/CT, and `git diff --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  frozen install passed with the same PATH and `--frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already
  installed from prior verification on this branch.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [ ] Playwright browser smoke: not run separately for this isolated tooling
  dependency bump.
- [ ] Responsive smoke: not run separately for this isolated tooling dependency bump.
- [ ] Production preview smoke: not run for this isolated tooling dependency bump.
- [ ] Supply-chain audit: not run for this isolated tooling dependency bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: e2e-install, separate browser/responsive/
  production smoke, and audit skipped because this commit only changes direct
  `globby` manifests and lockfile metadata; full validation/build/test/e2e
  passed.
- [x] Result: both direct `globby` declarations now use `^16.2.0` and resolve
  to `16.2.0`; stale direct-version search found no remaining direct
  `globby@14.1.0`. The remaining lockfile `globby@14.1.0` is transitive under
  `syncpack@13.0.4`, which was intentionally left out of scope.
- [x] Follow-up: commit as a separate `globby` dependency modernization commit.


### Session: 2026-05-16 - React 19.2 runtime stack upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `47d800ee`.
- [x] Dependency family: React runtime stack only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `react` `19.1.0` to `19.2.6`
  everywhere it is directly declared, `react-dom` `19.1.0` to `19.2.6`
  everywhere it is directly declared, root `pnpm.overrides.react-dom`
  `19.1.0` to `19.2.6`, and `react-error-boundary` `^6.0.0` to `^6.1.1`
  in `packages/core/app/package.json`, plus `pnpm-lock.yaml`.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook/Vite peer warning, Node
  `url.parse()` deprecation warning from install tooling, Sentry auth-token and
  chunk-size build warnings, Playwright `NO_COLOR`/`FORCE_COLOR` warnings, CT
  `use client` bundling warnings, and Storybook eval warnings.
- [x] Commands run: install, frozen install, focused React package list,
  stale-version/scope search, custom validation via `npm exec --package bun`,
  Biome CI, typecheck, build, test CI, e2e/CT, and `git diff --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  frozen install passed with the same PATH and `--frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`
  because local `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped; existing
  React `act(...)` warnings remain in `page-ws-home.spec.tsx`.
- [ ] `pnpm run e2e-install`: not rerun; browsers were already installed from
  prior Playwright verification on this branch.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [ ] Playwright browser smoke: not run separately; covered by the full
  Playwright E2E/CT gate for this focused React runtime bump.
- [ ] Responsive smoke: not run separately for this focused React runtime bump.
- [ ] Production preview smoke: not run for this focused React runtime bump.
- [ ] Supply-chain audit: not run for this isolated dependency-family commit.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: separate browser smoke, responsive smoke,
  production preview, and audit skipped to keep the commit focused; full install,
  frozen install, version inventory, custom validation, Biome CI, typecheck,
  build, unit tests, and full E2E/CT passed.
- [x] Result: React and React DOM are pinned to `19.2.6` throughout direct
  runtime manifests and the lockfile; `react-error-boundary` is updated to
  `^6.1.1`; no direct compatibility fallout was needed.
- [x] Follow-up: commit and push as a separate React runtime stack dependency
  modernization commit.


### Session: 2026-05-16 - lucide-react 1.16 icon package upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `7354710f`.
- [x] Dependency family: `lucide-react` only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `lucide-react` `^0.515.0` to
  `^1.16.0` in `packages/core/app`, `packages/core/command-handlers`,
  `packages/core/editor`, `packages/tooling/browser-entry`,
  `packages/ui/shadcn`, and `packages/ui/ui-components`, plus `pnpm-lock.yaml`.
- [x] Code migrations needed: `packages/core/app/src/layout/app-sidebar.tsx`
  replaces removed brand icon exports `Github` and `Twitter` with
  `ExternalLink`.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook/Vite peer warning, Node
  `url.parse()` deprecation warning from install tooling, Sentry auth-token and
  chunk-size build warnings.
- [x] Commands run: install, frozen install, source lucide export smoke, custom
  validation via `npm exec --package bun`, Biome CI, typecheck, build, test CI,
  e2e/CT, and `git diff --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  frozen install passed with the same PATH and `--frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because local `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already installed from the prior Playwright commit.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [ ] Playwright browser smoke: not run separately; existing Playwright E2E/CT coverage passed for this icon package bump.
- [ ] Responsive smoke: not run separately for this isolated icon package bump.
- [ ] Production preview smoke: not run for this isolated icon package bump.
- [ ] Supply-chain audit: not run for this isolated icon package bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: e2e-install, separate manual browser/responsive/
  production smoke, and audit skipped because this commit only changes the icon
  package and one direct import compatibility fix; frozen install, lucide export
  smoke, custom validation, Biome CI, typecheck, build, unit tests, and E2E/CT
  passed.
- [x] Result: `lucide-react` is updated to `^1.16.0` in all requested manifests,
  resolves to `1.16.0`, and direct source imports/build are compatible.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - Repo tooling patch/minor refresh

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `f23ff396`.
- [x] Dependency family: repo tooling patch/minor refresh only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: root `@biomejs/biome` `2.4.13` to
  `2.4.15`, root `@types/bun` `^1.3.13` to `^1.3.14`, `fs-extra` `^11.3.4` to
  `^11.3.5` in `packages/tooling/custom-scripts` and
  `packages/tooling/plop-configs`, `prettier` `3.5.3` to `3.8.3` in
  `packages/tooling/custom-scripts`, `tsx` `^4.21.0` to `^4.22.0` in
  `packages/tooling/e2e-tests`, plus `pnpm-lock.yaml`.
- [x] Code migrations needed: `packages/tooling/e2e-tests/playwright-ct.config.ts`
  unwraps the nested default export shape returned by `tsx` 4.22
  `tsImport('@bangle.io/env-vars', import.meta.url)`.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook/Vite peer warning, Node
  `url.parse()` deprecation warning from install tooling, Sentry auth-token and
  chunk-size build warnings, and CT `use client`/Storybook eval warnings.
- [x] Commands run: install, frozen install, package version check, custom
  validation via `npm exec --package bun`, Biome CI, typecheck, build, test CI,
  e2e/CT, and `git diff --check`.
- [x] `pnpm install`: passed with `PATH=/tmp/bangle-pnpm-shim:$PATH corepack pnpm install`; frozen install passed with `--frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because local `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already installed from the prior Playwright commit.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [ ] Playwright browser smoke: not run for this isolated repo tooling refresh.
- [ ] Responsive smoke: not run for this isolated repo tooling refresh.
- [ ] Production preview smoke: not run for this isolated repo tooling refresh.
- [ ] Supply-chain audit: not run for this isolated repo tooling refresh.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: e2e-install, browser/responsive/production smoke,
  and audit skipped because this commit changes repo tooling package versions,
  lockfile metadata, and the CT config compatibility shim; full local
  validation/build/test/e2e passed.
- [x] Result: requested repo tooling patch/minor refresh is applied and verified locally.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - Jotai state stack upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `9d50c406`.
- [x] Dependency family: Jotai state stack only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `jotai` `^2.12.5` to `^2.20.0` in
  `packages/core/app`, `packages/core/editor`, `packages/core/omni-search`,
  `packages/core/service-core`, `packages/js-lib/banger-editor`,
  `packages/platform/service-platform`, `packages/shared/base-utils`,
  `packages/shared/types`, `packages/tooling/browser-entry`, and
  `packages/tooling/test-utils`; `jotai-effect` `^2.0.4` to `^2.3.1` in
  `packages/core/service-core`; `pnpm-lock.yaml` resolves the matching package
  versions.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  deprecated subdependency warnings, Storybook/Vite peer warning, Node
  `url.parse()` deprecation warning from install tooling, existing
  `MODULE_TYPELESS_PACKAGE_JSON` warning from Vitest/env-vars, Sentry auth-token
  and chunk-size build warnings, CT `use client`/Storybook eval warnings, Radix
  dialog title/description warnings, nested `<p>` console warning, and local
  Sentry/telemetry 403.
- [x] Commands run: install, frozen install, package version check, targeted
  Jotai specs, broader service-core/service-platform Vitest specs, custom
  validation via `npm exec --package bun`, typecheck, Biome CI, build, test CI,
  e2e/CT, browser smoke, responsive smoke, console review, and `git diff
  --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`;
  frozen install passed with the same PATH and `--frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun --
  bun packages/tooling/custom-scripts/scripts/validate-all.ts` because local
  `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped; targeted
  direct Jotai tests passed, 2 files / 16 tests, and broader service package
  tests passed, 13 files / 69 tests.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already
  installed from the prior Playwright commit.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [x] Playwright browser smoke: passed on local dev server at
  `http://localhost:5173`; created Browser workspace, created note, typed editor
  content, opened command/search UI, toggled sidebar state, reloaded, confirmed
  persistence, and reviewed console.
- [x] Responsive smoke: passed one-off Playwright checks at 390x844 and
  1440x1000: welcome/create-workspace visible with no horizontal overflow;
  baseline Radix/Sentry warnings observed.
- [ ] Production preview smoke: not run for this isolated Jotai stack bump.
- [ ] Supply-chain audit: not run for this isolated Jotai stack bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: production preview and audit skipped because this
  commit only changes Jotai package versions and lockfile metadata; full local
  validation/build/test/e2e plus browser and responsive smoke passed.
- [x] Result: Jotai is updated to `^2.20.0` in all requested manifests, and
  `jotai-effect` is updated to `^2.3.1` only in `@bangle.io/service-core`.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - fake-indexeddb 6.2.5 storage test helper upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `a7c2f07c`.
- [x] Dependency family: `fake-indexeddb` only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: root `package.json` updates
  `fake-indexeddb` from `^6.0.1` to `^6.2.5`; `pnpm-lock.yaml` resolves the
  matching package version.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  Storybook/Vite peer warning, deprecated subdependency warnings, and Node
  `url.parse()` deprecation warning from install tooling.
- [x] Commands run: install, frozen install, package version check, targeted
  IndexedDB/fake storage Vitest specs, custom validation via `npm exec --package
  bun`, typecheck, Biome CI, build, test CI, and `git diff --check`.
- [x] `pnpm install`: passed with `corepack pnpm install`; frozen install passed
  with `corepack pnpm install --frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun --
  bun packages/tooling/custom-scripts/scripts/validate-all.ts` because local
  `bun` is not installed on PATH.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation,
  global typecheck, and `pnpm exec biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed; Sentry auth-token and chunk-size warnings remain.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped; targeted
  IndexedDB/fake storage Vitest specs passed, 3 files / 17 tests.
- [ ] `pnpm run e2e-install`: not run for this isolated root test helper patch bump.
- [ ] `pnpm run e2e:ci`: not run for this isolated root test helper patch bump.
- [ ] Playwright browser smoke: not run for this isolated root test helper patch bump.
- [ ] Responsive smoke: not run for this isolated root test helper patch bump.
- [ ] Production preview smoke: not run for this isolated root test helper patch bump.
- [ ] Supply-chain audit: not run for this isolated root test helper patch bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: E2E/CT, browser smoke, responsive smoke, production
  preview, and audit skipped because this commit only changes the root fake
  IndexedDB test helper; full local validation/build/test and targeted IndexedDB
  Vitest coverage passed.
- [x] Result: `fake-indexeddb` is updated to `^6.2.5` and resolved to `6.2.5`
  with no direct compatibility fallout.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - Sentry browser-entry family upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `325ef748`.
- [x] Dependency family: Sentry browser-entry family only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `@sentry/browser` `^9.47.1` to
  `^10.53.1`, `@sentry/vite-plugin` `^3.6.1` to `^5.3.0`, and remove unused
  `@sentry/tracing` from `packages/tooling/browser-entry/package.json` plus
  `pnpm-lock.yaml`.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing cyclic workspace dependency warning,
  Storybook/Vite peer warning, deprecated subdependency warnings, Node
  `url.parse()` deprecation warning from install tooling, Sentry missing auth
  token/source-map warnings, and existing chunk-size warning.
- [x] Commands run: install, frozen install, focused `@sentry/tracing` usage
  search, custom validation, Biome CI, typecheck, browser-entry build, root
  build, test CI, E2E/CT, and `git diff --check`.
- [x] `pnpm install`: passed with
  `PATH=/tmp/bangle-pnpm-shim:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games corepack pnpm install`.
- [x] `pnpm install --frozen-lockfile`: passed with the same PATH.
- [x] Focused `@sentry/tracing` usage search: only manifest/lockfile entries
  before removal when excluding generated `packages/tooling/browser-entry/dist`.
- [x] Focused `@sentry/tracing` usage search after removal: only this tracker
  session mentions `@sentry/tracing` when excluding generated
  `packages/tooling/browser-entry/dist`.
- [x] `pnpm run typecheck`: passed.
- [x] Custom validation passed via
  `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts`.
- [x] `pnpm exec biome ci . --diagnostic-level=error`: passed.
- [x] `pnpm --filter "@bangle.io/browser-entry" run build`: passed.
- [x] `pnpm run build`: passed.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [x] `pnpm -w run e2e:ci`: passed, 4 E2E tests and 5 component tests;
  existing Playwright CT `use client`, sourcemap, and Storybook eval warnings
  remain.
- [x] Build output inspection: browser-entry and root builds only reported
  Sentry telemetry, missing auth-token/release/source-map warnings, and the
  existing chunk-size warning; no Sentry plugin errors.
- [x] `git diff --check`: passed.
- [x] Result: Sentry browser-entry family is updated to `@sentry/browser`
  `^10.53.1` and `@sentry/vite-plugin` `^5.3.0`; unused `@sentry/tracing` is
  removed with no direct compatibility fallout.


### Session: 2026-05-16 - ProseMirror banger-editor runtime patch upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `dfbdd81e`.
- [x] Dependency family: ProseMirror editor runtime patch family in `@bangle.io/banger-editor` only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `prosemirror-model` `^1.25.4` to `^1.25.6`, `prosemirror-gapcursor` `^1.3.2` to `^1.4.1`, and `prosemirror-history` `^1.4.1` to `^1.5.0` in `packages/js-lib/banger-editor/package.json` plus `pnpm-lock.yaml`.
- [x] Code migrations needed: none. Lockfile keeps the ProseMirror runtime graph on `prosemirror-model` `1.25.6` to avoid duplicate nominal ProseMirror model types.
- [x] Baseline known warnings: existing cyclic workspace dependency warning and Storybook/Vite peer warning during install; Node `url.parse()` deprecation warning from install tooling.
- [x] Commands run: install, frozen install, package version check, targeted banger-editor Vitest specs, custom validation via `npm exec --package bun`, typecheck, Biome CI, build, test CI, targeted simple editor E2E, full e2e/CT, browser smoke, console review, `git diff --check`.
- [x] `pnpm install`: passed with `corepack pnpm install`; then `corepack pnpm install --frozen-lockfile` passed.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because `bun` is not installed on PATH locally.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation, `pnpm run typecheck`, and `biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed globally.
- [x] `pnpm run build`: passed.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped; targeted banger-editor specs also passed, 3 files / 36 tests.
- [ ] `pnpm run e2e-install`: not rerun; Playwright browsers were already installed from the prior Playwright commit.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests; targeted `simple-workspace-creation-worflow.e2e.ts` also passed.
- [x] Playwright browser smoke: passed on local dev server at `http://localhost:5173`; created Browser workspace, created note, typed editor content, reloaded, confirmed persistence, opened command/search UI, checked console.
- [ ] Responsive smoke: not run for this isolated editor runtime patch bump.
- [ ] Production preview smoke: not run for this isolated editor runtime patch bump.
- [ ] Supply-chain audit: not run for this isolated editor runtime patch bump.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: `e2e-install`, responsive smoke, production preview, and audit skipped because this commit only changes ProseMirror runtime patch versions; full local CI-style gates, full E2E/CT, and browser smoke passed.
- [x] Result: requested ProseMirror runtime patch upgrades are applied and verified locally.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - Playwright 1.60 e2e upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `b91447e`.
- [x] Dependency family: Playwright E2E/CT packages and matching CI container image only.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `@playwright/test` and `@playwright/experimental-ct-react` `^1.59.1` to `^1.60.0` in `packages/tooling/e2e-tests/package.json` plus `pnpm-lock.yaml`; CI container image to `mcr.microsoft.com/playwright:v1.60.0-noble`.
- [x] Code migrations needed: none.
- [x] Baseline known warnings: existing Storybook/Vite peer warning during install, Playwright `NO_COLOR`/`FORCE_COLOR` warning, CT build `use client` and Storybook eval warnings, Radix dialog title/description warnings, and nested `<p>` warning unrelated to Playwright.
- [x] Commands run: frozen install, Playwright version check, custom validation via `npm exec --package bun`, typecheck, Biome CI, build, test CI, Playwright browser install, e2e/CT, browser smoke, console review, `git diff --check`.
- [x] `pnpm install`: passed with `corepack pnpm install --frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because `bun` is not installed on PATH locally.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation, `pnpm run typecheck`, and `biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [x] `pnpm run e2e-install`: passed via `corepack pnpm -w run e2e-install`; installed/verified Playwright Chromium v1223.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [x] Playwright browser smoke: passed on local dev server at `http://localhost:5173`; created Browser workspace, created note, typed content, reloaded, confirmed persistence, opened command/search UI, checked console.
- [ ] Responsive smoke: not run for Playwright-only dependency bump.
- [ ] Production preview smoke: not run for Playwright-only dependency bump.
- [ ] Supply-chain audit: not run for this isolated Playwright commit.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: responsive/production/audit skipped because this commit only changes Playwright E2E/CT tooling and CI image.
- [x] Result: Playwright package family and matching CI image are updated and verified locally.
- [x] Follow-up: choose next dependency family after pushing this commit.


### Session: 2026-05-16 - Zod 4 custom-scripts upgrade

- [x] Branch: `deps/aggressive-modernization`.
- [x] Base commit: `36a76b4` (`docs: add dependency modernization tracker`).
- [x] Dependency family: Zod major upgrade.
- [x] PR/issue: upgrade branch commit only; no PR opened yet.
- [x] Manifest/lockfile changes intended: `zod` `^3.25.64` to `^4.4.3` in `packages/tooling/custom-scripts/package.json` plus `pnpm-lock.yaml`.
- [x] Code migrations needed: none; `config.ts` schema usage is compatible.
- [x] Baseline known warnings: browser smoke still reports existing Radix dialog title/description warnings and nested `<p>` warning unrelated to Zod.
- [x] Commands run: install, Zod version/list, custom-scripts Vitest specs, Zod schema runtime smoke, custom validation via `npm exec --package bun`, typecheck, Biome CI, build, test CI, e2e/CT, browser smoke, `git diff --check`.
- [x] `pnpm install`: passed with `corepack pnpm install --frozen-lockfile`.
- [x] `pnpm run custom-validation`: passed via `npm exec --yes --package bun -- bun packages/tooling/custom-scripts/scripts/validate-all.ts` because `bun` is not installed on PATH locally.
- [x] `pnpm run lint:ci`: equivalent gates passed manually: custom validation, `pnpm run typecheck`, and `biome ci . --diagnostic-level=error`.
- [x] `pnpm run typecheck`: passed.
- [x] `pnpm run build`: passed.
- [x] `pnpm run test:ci`: passed, 73 files / 726 passed / 1 skipped.
- [ ] `pnpm run e2e-install`: not run; browsers were already installed.
- [x] `pnpm run e2e:ci`: passed, 4 E2E tests and 5 component tests.
- [x] Playwright browser smoke: passed on local dev server at `http://localhost:5173`; created Browser workspace, created note, typed content, reloaded, confirmed persistence, opened command/search UI, checked console.
- [ ] Responsive smoke: not run for Zod-only tooling change.
- [ ] Production preview smoke: not run for Zod-only tooling change.
- [ ] Supply-chain audit: not run for this isolated Zod commit.
- [x] `git diff --check`: passed.
- [x] Skipped gates and why: responsive/production/audit skipped because this commit only changes custom-scripts Zod; `e2e-install` skipped because installed browsers were available.
- [x] Result: Zod 4 verified and ready to commit.
- [x] Follow-up: choose next dependency family after pushing this commit.
