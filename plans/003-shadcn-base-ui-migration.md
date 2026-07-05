---
title: Shadcn Base UI Migration
status: active
type: plan
archived: false
archived_on:
created: 2026-07-05
updated: 2026-07-05
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/603
related_issues: []
---

# Shadcn Base UI Migration

## Summary

Migrate Bangle's UI primitives from the existing Radix-backed
`@bangle.io/shadcn` package to Base UI-backed shadcn components. Both component
libraries may coexist during the migration, but new foundational work should
target `@bangle.io/base-ui`.

No backwards compatibility layer is required. Prefer direct Base UI semantics
over preserving Radix-only props such as `asChild`.

## Current Status

- `@bangle.io/shadcn` remains the current production Radix-backed package.
- `@bangle.io/base-ui` is the new Base UI-backed target package.
- The root `components.json` points shadcn CLI generation at
  `packages/ui/base-ui/src` through the `@bangle.io/base-ui` alias.
- Tailwind v4 and React 19 foundations already exist in
  `packages/tooling/browser-entry/src/index.css`.

## Scope

- Rebuild shadcn wrappers on `@base-ui/react` subpath imports.
- Keep explicit public barrels. Avoid `export *` from public package entry
  points.
- Migrate app consumers in thin vertical slices so the repo stays buildable.
- Replace `asChild` composition with Base UI `render` composition where the
  underlying primitive participates in behavior.
- Use `buttonVariants` or ordinary elements for links instead of rendering a
  Base UI button as an anchor.
- Convert state selectors from Radix `data-state` values to Base UI presence
  attributes such as `data-open`, `data-closed`, `data-disabled`,
  `data-checked`, and `data-unchecked`.

## Out Of Scope

- Do not rewrite unrelated app UI while migrating primitives.
- Do not move business behavior into `ui` packages.
- Do not migrate `Calendar` away from `react-day-picker` only for Base UI; it is
  not a Base UI primitive swap.
- Do not rewrite `Command` until a dedicated workflow can replace `cmdk` with a
  Base UI composition such as `Autocomplete` plus `Dialog`.

## Iteration Order

1. Foundation: package, registry config, low-risk primitives, validator green.
2. Presentational primitives: `input`, `separator`, `skeleton`.
3. Field primitives: migrate labels alongside their controls with Base UI
   `Field.Root` / `Field.Label` instead of a standalone native label wrapper.
4. Action primitives: `button`, `toggle`, `toggle-group`; update consumers from
   `asChild` to explicit links or `render`.
5. Disclosure primitives: `collapsible`, `accordion`.
6. Overlays: `tooltip`, `dialog`, `alert-dialog`, `sheet` as positioned dialog
   or drawer.
7. Menus and selection: `dropdown-menu`, `menubar`, `select`.
8. Complex compositions: `command`, sidebar wrappers, namespace re-exports.
9. Remove Radix dependencies and the old `@bangle.io/shadcn` package once all
   consumers have moved.

## Verification

- For every code iteration, run `pnpm lint:ci` and `pnpm test:ci`.
- Run focused Playwright tests for each user-visible component migration.
- Run `pnpm build` when changing package wiring, build inputs, dependencies, or
  theme behavior.
- Before PR update, run `pnpm local-ci-check`.

## Known Blockers

- Namespace re-exports from `@bangle.io/ui-components` expose broad shadcn
  surfaces and should be narrowed before large migrations.
- Composition-heavy consumers use Radix `asChild`; these need semantic review,
  not a mechanical rename.
- Dialog, menu, select, and tooltip popup anatomy changes from direct content
  parts to Base UI `Portal` / `Positioner` / `Popup` structures.

## Next Steps

- Add Base UI versions of the remaining low-risk primitives.
- Replace direct `@radix-ui/react-slot` usage in `@bangle.io/ui-components`
  wrappers with explicit component APIs or Base UI `render` where appropriate.
- Pick one low-risk app workflow and migrate it fully with Playwright coverage.
