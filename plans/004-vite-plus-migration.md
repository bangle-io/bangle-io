---
title: Vite Plus Migration
status: planned
type: plan
archived: false
created: 2026-06-14
updated: 2026-06-14
owner: mixed
related_prs: []
related_issues: []
---

# Vite Plus Migration

## Summary

Move Bangle.io from the current split frontend toolchain to Vite+ as the
canonical developer and CI entry point. Vite+ should own runtime setup,
dependency installation, dev/build/preview commands, Vitest, linting,
formatting, type checking, task orchestration, and CI command wiring wherever
it has a stable replacement.

The migration should intentionally remove older standalone tooling rather than
keeping duplicate paths around. Keep only tools that Vite+ does not replace,
such as Playwright E2E/component testing, Storybook, Chromatic, Sentry's Vite
plugin, Tailwind's Vite plugin, and React's Vite plugin if still required.

## Current Status

- [ ] Create a dedicated migration branch.
- [ ] Capture baseline results for the current toolchain.
- [ ] Install and inspect `vp` locally.
- [ ] Run `vp migrate --no-interactive` from the repository root.
- [ ] Review and normalize generated changes against Bangle workspace rules.
- [ ] Consolidate tool config into root `vite.config.ts`.
- [ ] Replace old package scripts with the Vite+ command surface.
- [ ] Migrate Vitest imports to `vite-plus/test`.
- [ ] Remove obsolete direct tooling dependencies and configs.
- [ ] Update CI to use `voidzero-dev/setup-vp`.
- [ ] Update developer and deployment docs.
- [ ] Complete local and CI verification.

## Scope

Adopt Vite+ for:

- `vp install` as the dependency installation path.
- `vp dev` for the browser app development server.
- `vp build` for production builds.
- `vp preview` for local production preview.
- `vp check` for combined format, lint, and type-check validation.
- `vp lint` and `vp fmt` for focused lint/format runs.
- `vp test` for Vitest-backed unit tests.
- `vp run` for package and monorepo task orchestration.
- Root `vite.config.ts` as the shared toolchain configuration file.

Remove or replace:

- Root `vitest.config.ts` once its behavior is represented in Vite+ config.
- Direct `vitest` imports in tests.
- Direct `@vitest/browser` references where Vite+ provides replacements.
- Direct Biome scripts and config after equivalent Oxlint/Oxfmt behavior is
  represented in Vite+ config.
- Direct `vite build`, `vite`, and `vite preview` package scripts.
- `vite-plugin-html` if a small local Vite-compatible HTML transform can cover
  the browser-entry injection needs.
- GitHub Actions setup for standalone Node, pnpm cache, and Biome where Vite+
  provides `setup-vp`.

Keep unless a Vite+ replacement is proven stable:

- Playwright E2E and Playwright component tests.
- Storybook and Chromatic.
- Sentry Vite plugin.
- Tailwind Vite plugin.
- React Vite plugin.
- Bangle custom maintenance scripts that validate workspace rules beyond
  generic lint/format/type checks.

## Migration Plan

### Phase 0: Baseline

- Create a branch such as `chore/adopt-vite-plus`.
- Record current dirty state before tool-generated edits.
- Run:
  - `pnpm install`
  - `pnpm run typecheck`
  - `pnpm run lint:ci`
  - `pnpm build`
  - `pnpm run test:ci`
  - `pnpm run e2e:ci`
- Record any pre-existing failures, warnings, or local-only console noise.

### Phase 1: Official Migration

- Install `vp` for the local environment.
- Run:
  - `vp help`
  - `vp help migrate`
  - `vp help check`
  - `vp help run`
  - `vp help build`
- Run `vp migrate --no-interactive` from the repository root.
- Review all generated changes manually before continuing.
- Keep the migration constrained to tooling; do not mix in app feature work.

### Phase 2: Root Config Consolidation

- Add or convert root `vite.config.ts` to import `defineConfig` from
  `vite-plus`.
- Move the root Vitest config into the Vite+ `test` block.
- Move Biome formatting intent into the Vite+ `fmt` block.
- Move Biome linting intent into the Vite+ `lint` block with package/test/story
  overrides.
- Add Vite Task entries under `run` for repo-specific commands that remain
  outside built-in Vite+ commands.
- Preserve workspace hierarchy rules and package import conventions.

### Phase 3: Browser Entry

- Convert `packages/tooling/browser-entry/vite.config.ts` to use Vite+
  `defineConfig`.
- Keep app-specific Vite plugins for React, Tailwind, Sentry, and HTML/env
  injection as needed.
- Replace `vite-plugin-html` with a local transform only if behavior is
  equivalent for translation, theme, and env-var injection.
- Remove unsafe serializer typing while touching the config.
- Replace browser-entry scripts with `vp dev`, `vp build`, and `vp preview`.

### Phase 4: Tests

- Rewrite imports from `vitest` to `vite-plus/test`.
- Rewrite `@vitest/browser` references to Vite+ browser test paths where
  applicable.
- Update `vitest-global-setup.js`.
- Delete root `vitest.config.ts` after parity is verified.
- Make `vp test` the canonical unit test command.

### Phase 5: Scripts And Dependencies

- Replace root scripts with Vite+ commands.
- Remove direct Biome usage after Vite+ lint/format parity is acceptable.
- Keep custom validation scripts only for Bangle-specific workspace checks.
- Remove obsolete dependencies after imports and scripts are migrated.
- Run `vp install` to refresh the lockfile.
- Audit the lockfile for stale direct references to removed tools.

### Phase 6: CI And Docs

- Replace GitHub Actions Node/pnpm/Biome setup with `voidzero-dev/setup-vp`.
- Use:
  - `vp install`
  - `vp check`
  - `vp test`
  - `vp build`
  - `vp run e2e:ci`
- Keep Playwright browser install/cache behavior as needed.
- Update `AGENTS.md`, deployment notes, and any contributor docs to use Vite+
  commands.
- Update plop/test templates that import from `vitest`.

## Verification

Run after the migration:

- [ ] `vp install`
- [ ] `vp check`
- [ ] `vp test`
- [ ] `vp build`
- [ ] `vp run e2e:ci`
- [ ] `pnpm audit --audit-level low` or Vite+ equivalent if available.

Run browser smoke against a local production preview:

- [ ] Start preview with Vite+.
- [ ] Verify page title is `Bangle App`.
- [ ] Verify welcome screen renders `Create Workspace`.
- [ ] Create a Browser workspace.
- [ ] Create a note.
- [ ] Type editor content.
- [ ] Reload and confirm workspace, note, and content persist.
- [ ] Open search or command UI and confirm it is usable.
- [ ] Record console errors and separate known local-only Sentry noise from app
  regressions.

## Known Risks

- Vite+ is still early tooling, so Oxlint/Oxfmt behavior may not fully match
  current Biome rules.
- Storybook and Playwright CT may continue to require direct Vite-compatible
  dependencies even after the app itself moves to Vite+.
- Removing `vite-plugin-html` touches app bootstrapping because translation,
  theme, and env-var injection happen before React starts.
- Vite+ migration may upgrade the Vite major line, which can interact with the
  existing Playwright CT Vite override documented in
  `plans/archived/003-upgrade-wrap-up.md`.
- The repo already has local uncommitted toolchain changes, so generated edits
  must be reviewed carefully before cleanup.

## Out of Scope

- App feature work or UI redesign.
- Markdown/editor behavior changes.
- Production deploy unless explicitly requested after local and CI validation.
- Replacing Playwright or Storybook unless Vite+ ships a stable direct
  replacement.

## Next Steps

- Review the archived Playwright CT Vite override note in
  `plans/archived/003-upgrade-wrap-up.md`.
- Run the Phase 0 baseline and record results in this plan.
- Install `vp`, run the official migration, and review the diff before making
  manual cleanup changes.
