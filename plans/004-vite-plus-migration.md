---
title: Vite Plus Migration
status: planned
type: plan
archived: false
created: 2026-06-14
updated: 2026-08-01
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

Not started. Vite+ reached beta in June 2026 (MIT, open source), a real
de-risk versus the alpha this plan was written against — but still pre-1.0.
The Known Risks below stand, in particular Oxlint/Oxfmt-versus-Biome rule
parity, which decides whether this is a net win. Re-evaluate at 1.0; no
forcing function today.

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

## Out of Scope

- App feature work or UI redesign.
- Markdown/editor behavior changes.
- Production deploy unless explicitly requested after local and CI validation.
- Replacing Playwright or Storybook unless Vite+ ships a stable direct
  replacement.
