---
title: Dependency Update Modernization Plan
status: completed
type: plan
archived: true
created: 2026-05-25
updated: 2026-06-14
owner: mixed
related_prs:
  - https://github.com/kepta/bangle-io-2/pull/299
related_issues: []
---

> DONE Completed on 2026-06-14 after TypeScript 6 deployment commit
> `e3d52a47`. Final verification passed with clean-checkout install/lint/build,
> `pnpm audit --audit-level low`, `pnpm run lint:ci`, `pnpm build`,
> `pnpm run test:ci`, `pnpm run e2e:ci`, and Playwright CLI production-preview
> smoke testing. Local preview console retained one Sentry ingest `403` from
> the unauthenticated local build; production smoke for `e3d52a47` was already
> clean aside from known editor/plugin debug logs.

# Dependency Update Modernization Plan

## Summary

Modernize Bangle.io only through dependency updates, staged by risk: easy,
medium, and hard. Each phase must be small enough to review, and each phase
must pass automated checks plus manual Playwright CLI smoke testing of the
app's core local-first workflow.

Before updating anything, capture the baseline from `pnpm outdated -r`, the
current lockfile state, and a Playwright CLI smoke run against the existing app.

## Current Status

PR #299 completed the broad aggressive dependency modernization slice on
2026-06-13. Automated CI is green for lint, unit tests, and E2E tests.

This plan is archived because all tracked modernization and hardening work is
complete:

- [x] TypeScript major upgrade to 6.
- [x] Storybook latest major upgrade.
- [x] Final hardening after merge, including clean-checkout verification,
  production-preview smoke, and supply-chain review.
- [x] Follow-up TS 7/tsgo investigation plan after TypeScript 6 lands.

Final hardening progress on 2026-06-14:

- [x] Clean-checkout verification of `e3d52a47` passed from
  `/tmp/bangle-io-clean-e3d52a47` with `pnpm install --frozen-lockfile`,
  `pnpm run lint:ci`, and `pnpm build`.
- [x] Local production-preview smoke passed from the clean checkout with
  `pnpm preview-production -- --host 127.0.0.1 --port 4173` and Playwright CLI
  against `http://localhost:4173/?previewCheck=e3d52a47`.
  - Verified title `Bangle App`.
  - Verified welcome screen and `Create Workspace`.
  - Created Browser workspace `Preview Smoke e3d52a4`.
  - Created note `preview-smoke.md`.
  - Typed `Production preview smoke e3d52a4 persisted content.`
  - Opened the omni/search UI and verified recent note, commands, and all notes
    rendered.
  - Reload confirmed the workspace, note, and exact editor content persisted.
  - Console after reload had one local-preview-only Sentry ingest `403` error
    from `https://o573373.ingest.us.sentry.io/.../envelope/`, with zero
    warnings; app runtime logs were otherwise editor/plugin debug output.
- [x] Supply-chain review was run with `pnpm audit --audit-level moderate`.
  The first run failed with 61 advisories (`7` low, `22` moderate, `30` high,
  `2` critical), concentrated in `vite-plugin-html`/`ejs`/`jake`,
  `@storybook/test-runner` transitive packages, root
  `plop`/`node-plop`/`handlebars`, and `tsx`/`vite`/`esbuild` build tooling
  paths.
- [x] Supply-chain audit remediation completed with targeted `pnpm.overrides`
  and lockfile refresh. `pnpm audit --audit-level low` now reports no known
  vulnerabilities.
- [x] Post-remediation validation passed with `pnpm run lint:ci`,
  `pnpm build`, `pnpm run test:ci`, and `pnpm run e2e:ci`.
- [x] Post-remediation local production-preview smoke passed with
  `pnpm preview-production -- --host 127.0.0.1 --port 4174` and Playwright CLI
  against `http://localhost:4174/?auditFixCheck=e3d52a47`.
  - Created Browser workspace `Audit Fix Smoke e3d52a4`.
  - Created note `audit-fix-smoke.md`.
  - Typed `Audit override smoke e3d52a4 persisted content.`
  - Opened the omni/search UI.
  - Reload confirmed the workspace, note, and exact editor content persisted.
  - Console after reload had one local-preview-only Sentry ingest `403` error
    from `https://o573373.ingest.us.sentry.io/.../envelope/`, with zero
    warnings.

## TypeScript 7 / tsgo Follow-up Investigation

Do not start this as part of the TypeScript 6 stabilization branch. Treat it as
the next separate dependency experiment after this plan is archived.

Official TypeScript 7 beta guidance on 2026-06-14:

- Install side-by-side with TypeScript 6 using
  `pnpm add -D @typescript/native-preview@beta`.
- Use `pnpm exec tsgo --version` and `pnpm exec tsgo -b` as the first CLI
  parity check against the existing `pnpm run typecheck` / `tsc -b` flow.
- Keep the `typescript` package on TypeScript 6 while validating `tsgo`; do not
  swap `typescript` to TypeScript 7 in the first investigation slice.
- Compare diagnostics and timings between `pnpm run typecheck` and
  `pnpm exec tsgo -b`.
- If `tsgo -b` passes, run `pnpm run lint:ci`, `pnpm build`, `pnpm run test:ci`,
  and the Playwright CLI smoke checklist.
- Check ecosystem/tooling compatibility before any production migration:
  `typescript-eslint`/Biome integration, Vite and Vitest compiler API usage,
  Storybook test-runner, project references, declaration emit, watch mode, and
  any packages that import `typescript` directly.
- Use `@typescript/native-preview@beta` for the planned branch. The npm
  `latest` dist-tag was `7.0.0-dev.20260614.1` on 2026-06-14 and may be used
  only for a separate nightly comparison after the beta check.

## Phase 0: Baseline Gate

- Run `pnpm install`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Run `pnpm test:ci`.
- Start the app with `pnpm start`.
- Run manual Playwright CLI smoke testing:
  - `playwright-cli open http://localhost:4000`
  - Verify the title is `Bangle App`.
  - Verify the welcome screen renders `Create Workspace`.
  - Create a Browser workspace.
  - Create a note.
  - Type editor content.
  - Reload.
  - Confirm the workspace, note, and content still render.
  - Open search or command UI and confirm it is usable.
- Record known baseline console warnings with `playwright-cli console`.

## Phase 1: Easy Dependency Updates

Low-risk patch and minor updates only. Do not take major-version jumps in this
phase.

Update patch/minor packages such as:

- Radix packages within current major versions.
- `@floating-ui/dom`
- `@tanstack/react-virtual`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@types/react`, `@types/react-dom`, `@types/bun`, and
  `@types/wicg-file-system-access`
- `postcss`
- `tailwind-merge`
- `sonner`
- `tsx`
- ProseMirror patch/minor packages only.
- Small tooling patch updates like `execa`, `fs-extra`, `p-map`, `plop`, and
  `@swc/jest`.

After updates:

- Run `pnpm install`.
- Run `pnpm typecheck`, `pnpm build`, and `pnpm test:ci`.
- Run the same Playwright CLI smoke checklist from Phase 0.
- Fix only dependency fallout. Do not refactor app behavior.

## Phase 2: Medium Dependency Updates

Update minor-version toolchain and app-facing dependencies that may affect
build/runtime behavior but should not require architectural changes.

Update:

- Playwright packages: `@playwright/test` and
  `@playwright/experimental-ct-react`.
- Reinstall Playwright browser dependencies with `pnpm e2e-install`.
- Tailwind stack minor updates: `tailwindcss`, `@tailwindcss/vite`, and related
  Tailwind helper packages.
- `wouter` minor updates.
- Storybook patch updates within v8 only if available.
- Sentry patch/minor updates that do not cross major versions.

After updates:

- Run `pnpm install`.
- Run `pnpm typecheck`, `pnpm build`, `pnpm test:ci`, and `pnpm e2e:ci`.
- Run manual Playwright CLI smoke testing again.
- Add responsive Playwright CLI checks:
  - `playwright-cli resize 390 844`
  - Verify workspace creation and note navigation still work on mobile width.
  - `playwright-cli resize 1440 1000`
  - Verify sidebar, editor, search, and reload persistence still work.

## Phase 3: Hard Dependency Updates

Major updates only, one dependency family at a time. Each family should be its
own commit or pull request when possible.

Phase 3 progress:

- [x] Biome beta to stable latest v2.
- [x] Vite 6 to latest compatible major and `@vitejs/plugin-react` latest compatible major.
- [x] Vitest 3 to 4, including `@vitest/browser` and `@vitest/coverage-v8`.
- [x] Playwright packages and browser/component test fallout.
- [x] Tailwind/CSS support stack refresh.
- [x] React runtime stack compatibility refresh.
- [x] ProseMirror and editor package stack.
- [x] DOM test environment major updates for `happy-dom` and `jsdom`.
- [x] Sentry major updates.
- [x] Jest removal plan for unused Jest dependencies.
- [x] Zod 3 to 4.
- [x] `lucide-react` major update.
- [x] `@types/node` major update.
- [x] GitHub Actions major updates.
- [x] TypeScript 5.8 to 6.
- [x] Storybook 8 to latest major.

TypeScript 6 notes:

- Use `typescript@^6.0.3` as the focused major upgrade.
- Keep `moduleResolution: "node"` for this slice and explicitly set
  `ignoreDeprecations: "6.0"`. A trial move to `moduleResolution: "bundler"`
  exposed unrelated package export typing gaps and Vite 6/7 type duplication.
- Restore local ambient declarations for File System Access API permission
  methods and `window.showDirectoryPicker`, which TypeScript 6 no longer
  provides through the selected lib/types combination.
- Do not introduce `tsgo` in this branch. Treat TS 7/tsgo as a separate
  follow-up after TypeScript 6 is merged and stable.
- Local validation passed on 2026-06-14 with `pnpm run lint:ci`,
  `pnpm build`, `pnpm run test:ci`, `pnpm run e2e:ci`, and Playwright CLI
  smoke testing against the Vite dev server on `http://localhost:5173/`.

Candidate hard updates:

- Vite 6 to latest compatible major and `@vitejs/plugin-react` latest compatible major. Keep Storybook on its own compatible Vite line unless the Storybook major update is part of the PR.
- Vitest 3 to 4, including `@vitest/browser` and `@vitest/coverage-v8`.
- TypeScript 5.8 to 6.
- TypeScript 7/tsgo investigation after TS 6 is merged.
- Storybook 8 to latest major.
- Sentry major updates.
- Jest 29 to 30 if still needed.
- Zod 3 to 4.
- `lucide-react` major update.
- `@types/node` major update only if the runtime/tooling supports it.

For each family:

- Update only that family.
- Run `pnpm install`.
- Run `pnpm typecheck`, `pnpm build`, relevant unit tests, and relevant
  end-to-end/component tests.
- Run the full Playwright CLI smoke checklist.
- If failures require broad app refactors, stop and either pin the old version
  or split the required code migration into a separate plan.

## Playwright CLI Core Smoke Checklist

Use this after every phase:

- `playwright-cli open http://localhost:4000`
- `playwright-cli eval "document.title"` returns `Bangle App`.
- Welcome screen shows `Create Workspace`.
- Create a Browser workspace.
- Create a note.
- Type visible editor content.
- Navigate away and back through sidebar or recent note links.
- Open omni-search/command UI and confirm it renders.
- Reload and confirm note content persists.
- Check console output with `playwright-cli console`; only known non-blocking
  warnings are acceptable.

## Assumptions

- Scope is dependency updates only.
- No UI redesign, feature work, or storage architecture rewrite.
- Easy and medium phases may update `package.json` and `pnpm-lock.yaml`.
- Hard phase may require code migrations, but only when directly caused by
  dependency changes.
- Any dependency that breaks core workspace/note persistence is rolled back or
  isolated for a separate migration.
