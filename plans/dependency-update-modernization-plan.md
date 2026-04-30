# Dependency Update Modernization Plan

## Summary

Modernize Bangle.io only through dependency updates, staged by risk: easy,
medium, and hard. Each phase must be small enough to review, and each phase
must pass automated checks plus manual Playwright CLI smoke testing of the
app's core local-first workflow.

Before updating anything, capture the baseline from `pnpm outdated -r`, the
current lockfile state, and a Playwright CLI smoke run against the existing app.

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

Candidate hard updates:

- Vite 6 to latest major and `@vitejs/plugin-react` latest major.
- Vitest 3 to 4, including `@vitest/browser` and `@vitest/coverage-v8`.
- TypeScript 5.8 to 6.
- Biome beta to stable latest v2.
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
