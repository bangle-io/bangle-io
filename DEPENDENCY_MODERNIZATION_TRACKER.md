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
- [ ] Jest 30 family or removal plan if Jest is no longer needed.
- [x] Zod major upgrade for custom scripts and validation schemas.
- [ ] Sentry major alignment across browser, tracing, and Vite plugin packages.
- [ ] `lucide-react` and icon/UI package major or large minor updates.
- [ ] Playwright major or large-version jumps, including container image and
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
