---
title: Shadcn Base UI Migration
status: completed
type: plan
archived: true
archived_on: 2026-07-05
created: 2026-07-05
updated: 2026-07-05
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/603
related_issues: []
---

> DONE Completed on 2026-07-05. Every UI consumer moved from the Radix-backed
> `@bangle.io/shadcn` to `@bangle.io/base-ui`; the shadcn package and all
> `@radix-ui/*` runtime dependencies were removed. All Base UI primitives were
> regenerated from the genuine `shadcn@latest -b base` registry (shadcn CLI
> 4.13, `@base-ui/react` 1.6) rather than hand-adapted, and the sidebar +
> breadcrumb blocks were refreshed the same way. Radix `Slot` was replaced with
> Base UI `useRender`. Held components (`command` on cmdk, `calendar` on
> react-day-picker) stayed as-is. Theming kept Bangle's `--BV-*` /
> `.BU_dark-scheme` convention and `@theme inline` bridge; only `--font-heading`
> was added. Final verification: `pnpm local-ci-check` passed in full
> (custom-validation, tsgo typecheck, Biome, knip:ci, test:ci 1376 unit tests,
> e2e:ci 107 Playwright tests + component tests, production build, and the
> Electron persistence smoke). Regressions caught and fixed during the refresh:
> DropdownMenuLabel used standalone (now a plain div), the settings width
> control's radio role (rebuilt on a Base UI radio-group), AppAlertDialog
> action/cancel close semantics, and Base UI Select label resolution via an
> `items` map.

# Shadcn Base UI Migration

## Summary

Migrate Bangle's UI primitives from the existing Radix-backed
`@bangle.io/shadcn` package to Base UI-backed shadcn components. Both component
libraries may coexist during the migration, but new foundational work should
target `@bangle.io/base-ui`.

No backwards compatibility layer is required. Prefer direct Base UI semantics
over preserving Radix-only props such as `asChild`.

The end goal is a complete migration: all app and UI consumers should use the
modern Base UI-backed component layer, Radix-only dependencies should disappear
unless a deliberate non-shadcn exception remains, and the old `@bangle.io/shadcn`
package should be removed. Different visual details are acceptable during this
modernization. Broken workflows, focus behavior, keyboard behavior, persistence,
or accessibility regressions are not acceptable.

## Current Status

Migration complete (pending final CI + merge). `@bangle.io/shadcn` has been
deleted and every consumer now uses `@bangle.io/base-ui`.

- All primitives regenerated from the genuine `shadcn@latest -b base` registry
  (shadcn CLI 4.13, `@base-ui/react` 1.6) rather than hand-adapted wrappers:
  button, input, separator, skeleton, label, toggle, toggle-group, collapsible,
  accordion, tooltip, dialog, alert-dialog, sheet, dropdown-menu, select, plus a
  new radio-group. Adapted to Bangle conventions: `cn` from `@bangle.io/ui-misc`,
  global `t` for close labels, explicit barrels, classic-JSX React imports.
- Held components stay as Bangle's (not Base UI primitive swaps): `command`
  (cmdk, with Bangle's CommandBadge/CommandHints/CommandInput extras) and
  `calendar` (react-day-picker). `sidebar` and `breadcrumb` are app-customized
  compositions now built on Base UI `useRender` instead of Radix `Slot`.
- No `@radix-ui/*` runtime dependency remains anywhere in the repo.
- Theming: Bangle keeps its `--BV-*` (values) / `.BU_dark-scheme` (scheme class)
  convention and the `@theme inline` `var()` bridge, which matches the modern
  shadcn Tailwind v4 pattern. Only addition required was
  `--font-heading: var(--font-sans)` in `browser-entry/src/index.css`.
- Deliberate deviations from the generated source (documented in code):
  `DropdownMenuLabel` renders a plain `<div>` (the shadcn `Menu.GroupLabel`
  throws when used standalone, which Bangle does); the settings width control
  uses the radio-group (Base UI `ToggleGroup` is not a radiogroup like Radix's
  was, so `role="radio"` a11y is preserved via `RadioGroup`).

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

## Reference Docs Workflow

Before migrating each component family, read the current official docs instead
of copying assumptions from the old Radix wrappers:

- Shadcn Base UI default / changelog:
  `https://ui.shadcn.com/docs/changelog`
- Shadcn CLI:
  `https://ui.shadcn.com/docs/cli`
- Shadcn `components.json`:
  `https://ui.shadcn.com/docs/components-json`
- Shadcn monorepo guidance:
  `https://ui.shadcn.com/docs/monorepo`
- Shadcn theming:
  `https://ui.shadcn.com/docs/theming`
- Shadcn Base component docs:
  `https://ui.shadcn.com/docs/components/base/<component-name>`
- Base UI composition:
  `https://base-ui.com/react/handbook/composition`
- Base UI TypeScript:
  `https://base-ui.com/react/handbook/typescript`
- Base UI component docs:
  `https://base-ui.com/react/components/<component-name>`

For every component migration, record in the PR description which docs were
checked and any API differences that affected implementation. Treat shadcn docs
as the styling/API starting point and Base UI docs as the source of truth for
primitive behavior, composition, focus management, and accessibility semantics.

## Reference Project Setup

Use a throwaway project to inspect the latest generated shadcn Base UI code
before editing Bangle wrappers. Do not let the CLI rewrite this monorepo
directly until the generated output has been reviewed.

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
pnpm dlx shadcn@latest init -b base -t vite -p nova -n scratch \
  -y --no-monorepo --no-reinstall --css-variables
cd scratch
pnpm dlx shadcn@latest add button dialog dropdown-menu select \
  --dry-run --view
```

For the Bangle repo itself, keep `components.json` aligned with the target
package, but do not run root CLI writes until alias resolution has been made
explicit. The readiness check is:

```bash
pnpm dlx shadcn@latest info
```

That command must pass before using root-level `shadcn add`. Until then, use the
throwaway project as the source reference, then adapt the generated code to
Bangle's package boundaries, explicit public barrels, translations rules, and
tests. Once alias resolution is fixed, inspect root output with:

```bash
pnpm dlx shadcn@latest add <component> --dry-run --view
```

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

## Modernization Rules

- Prefer Base UI's current APIs even when this forces call-site updates.
- Prefer explicit component props and semantic elements over compatibility
  shims that preserve old Radix-only patterns.
- Keep behavior stable through tests: opening/closing, keyboard navigation,
  focus restoration, disabled states, form submission, selection, checked state,
  scroll behavior, portal layering, and persistence-facing workflows.
- Visual differences are acceptable when they come from the new shadcn/Base UI
  defaults or a deliberate simplification.
- Do not accept regressions in accessible names, roles, tab order, escape key
  behavior, outside click behavior, or destructive-action confirmation flows.
- When generated shadcn code conflicts with Bangle invariants, document the
  difference in the PR and preserve Bangle's data-safety and local-first
  behavior.

## Verification

- For every code iteration, run `pnpm lint:ci` and `pnpm test:ci`.
- Run focused Playwright tests for each user-visible component migration.
- Add or update Playwright coverage for the migrated user workflow. Component
  tests may supplement this, but released behavior needs E2E coverage.
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
- Use a throwaway shadcn Base UI project to review the latest generated source
  before each component-family migration.
- Replace direct `@radix-ui/react-slot` usage in `@bangle.io/ui-components`
  wrappers with explicit component APIs or Base UI `render` where appropriate.
- Pick one low-risk app workflow and migrate it fully with Playwright coverage.
