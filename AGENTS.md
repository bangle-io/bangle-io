# AGENTS.md

## Task Completion Requirements

- Run commands from the repository root.
- Before considering a code change complete, `pnpm lint:ci` and
  `pnpm test:ci` must pass. `lint:ci` includes workspace validation,
  TypeScript (`tsgo`) project-reference checks, and Biome.
- Run `pnpm build` when changing browser bootstrapping, build configuration,
  dependencies, environment variables, themes, or production-only behavior.
- Run the relevant Playwright suite when changing user-visible UI, routing,
  editor behavior, browser storage, persistence, or cross-tab behavior:
  `pnpm e2e:ci` for the full E2E and component suite, or a narrower filtered
  command while iterating.
- Every feature intended for release must include a high-quality Playwright E2E
  test that proves its user-visible behavior. Component tests may supplement
  this coverage but do not replace the released workflow test. A manual smoke
  test also does not replace committed regression coverage.
- Before every release, use `playwright-cli` against the release candidate and
  manually exercise the affected feature plus the local-first persistence smoke
  path. A release is not ready based only on automated test results.
- Before opening or updating a PR, and before any release,
  `pnpm local-ci-check` must pass. It runs every root script ending in `:ci`,
  including Playwright.
- Documentation-only changes do not require the code suites. Verify the
  documented paths and commands instead.
- Never hide a failing check. Distinguish failures introduced by the change
  from existing failures and report the exact command and error.

## Project Snapshot

Bangle.io is a local-first browser note-taking app. Notes are durable Markdown;
the primary editing experience is WYSIWYG through ProseMirror and bangle.dev.
Workspaces can use IndexedDB-backed storage or the browser Native File System
API.

The application is frontend-heavy and service-oriented: React renders from
Jotai state, commands invoke handlers, services are wired with `poor-mans-di`,
and `root-emitter` carries typed local and cross-tab events.

## Core Priorities

1. Protect user data. Never turn a read, parse, permission, or storage failure
   into deletion, empty content, or a misleading success state.
2. Preserve Markdown fidelity. WYSIWYG parsing and serialization must not
   silently discard or reinterpret source content.
3. Keep local-first behavior predictable across reloads, tabs, IndexedDB, and
   Native FS.
4. Prefer maintainable package-level solutions over one-off fixes, while
   keeping changes small and explicit.

When priorities conflict, choose durable data, correctness, and a clear
recovery path over convenience.

## Maintainability

- Before adding functionality, inspect the owning package and lower layers for
  existing behavior that should be extended or shared.
- Duplicate business rules or state transitions across files are a code smell.
  Extract shared behavior into the lowest workspace allowed by the dependency
  graph (`js-lib`, `shared`, `platform`, `ui`, or a service), with a typed public
  API and focused tests.
- Refactor existing modules and package APIs when that produces one coherent
  implementation. Do not preserve a poor boundary by adding a parallel local
  code path or a one-off workaround.
- Keep the abstraction proportional to demonstrated reuse: remove real
  duplication, but do not create speculative frameworks for a single use case.

## Workspace Model

The PNPM workspace is split by architectural role. The authoritative dependency
rules are the `bangleWorkspaceConfig.allowedWorkspaces` fields in each
`packages/<workspace>/package.json`; `pnpm custom-validation` enforces them.

| Workspace | May depend on | Role |
| --- | --- | --- |
| `tooling` | any workspace | Build entry, tests, Storybook, scripts |
| `core` | core, platform, ui, shared, js-lib, tooling | App and business logic |
| `platform` | shared, js-lib | Browser/platform implementations |
| `ui` | ui, shared, js-lib | Presentational components |
| `shared` | shared, js-lib | Cross-layer contracts and app utilities |
| `js-lib` | js-lib | App-agnostic libraries |

Two validator exceptions are intentional: `@bangle.io/types` may reference any
workspace for type contracts, and `@bangle.io/test-utils` may be used as a dev
dependency anywhere. Do not use either exception to move runtime logic across
layers. Do not widen an allowed-workspace list to make an import pass; first put
the behavior in the correct layer.

Package metadata also declares `banglePackageConfig.env` (`browser`, `nodejs`,
or `universal`) and `kind`. Browser packages cannot gain Node runtime
dependencies, universal packages must remain universal, and service dependency
order is `service-platform` -> `service-core` -> `service-ui`.

## Package Roles

- `packages/tooling/browser-entry`: Vite entry point. Installs build globals,
  translations, theme, Sentry, root emitter, Jotai store, and services before
  rendering React.
- `packages/core/app`: application pages, layouts, and React composition.
- `packages/core/editor`: Bangle-specific editor service, save lifecycle, and
  ProseMirror integration.
- `packages/js-lib/banger-editor` and `prosemirror-plugins`: reusable editor
  schema/plugins and Markdown parsing/serialization behavior.
- `packages/core/service-core`: business services with platform capabilities
  supplied through typed service slots and DI.
- `packages/core/initialize-services`: the composition root that wires core
  services to browser platform implementations and mounts the container.
- `packages/platform/service-platform`: routers, databases, file-storage
  adapters, and platform error handlers. It must not import from `core` or `ui`.
- `packages/shared/commands`: serializable command definitions and validation.
  Implementations belong in `packages/core/command-handlers`.
- `packages/shared/ws-path`: canonical parsing, validation, and normalization of
  workspace paths.
- `packages/shared/root-emitter`: typed app events and the explicit cross-tab
  event allowlist.
- `packages/ui/shadcn`, `ui-components`, and `ui-misc`: reusable UI without
  core business behavior.
- `packages/tooling/test-utils`: real service/container test setup shared across
  packages.

## Architectural Invariants

### Storage and editor safety

- Await storage mutations before navigation or success state. Do not use
  floating promises for create, write, rename, move, or delete operations.
- Preserve the latest unsaved editor content until its durable write succeeds.
  Keep writes ordered or coalesced so an older completion cannot overwrite a
  newer edit.
- Treat read failures, Markdown parse failures, permission loss, quota errors,
  and aborted operations as distinct failure paths. A failed load must never
  write fallback or normalized content back to storage.
- Destructive and multi-step operations need explicit partial-failure behavior.
  Keep source data until destination durability is confirmed.
- Keep IndexedDB, Native FS, and memory adapters behaviorally aligned. Add
  contract-level tests when changing a file-storage operation.
- Pass `AbortSignal` through long-running/list/search/platform operations and
  clean up listeners, editors, and subscriptions with the owning service
  lifetime.

### Markdown fidelity

- Changes to editor schema, extensions, parsing, or serialization require
  parse/serialize round-trip tests.
- Cover whitespace, nested lists, task lists, links, images, code, and any raw
  or unsupported construct affected by the change.
- Make normalization intentional and visible in tests. If exact preservation
  is impossible, provide a non-destructive recovery or warning path.

### Paths, commands, services, and events

- A `wsPath` has the form `<workspaceName>:<fileOrDirPath>`. Use `WsPath`
  constructors/assertions and helpers instead of splitting or joining these
  strings manually. Directory paths normalize with a trailing slash.
- Command IDs use namespaced kebab-case such as
  `command::ui:toggle-sidebar`. Definitions stay in `@bangle.io/commands`;
  handlers stay in `@bangle.io/command-handlers`.
- Service dependencies are constructor-injected and declared with `static deps`.
  Configure or replace services before container instantiation. Register
  cleanup against the service/root abort signal.
- Jotai atoms are the React state source of truth. Do not add a parallel global
  state mechanism for app state.
- Add cross-tab events only deliberately by updating the typed event union and
  `CROSS_TAB_EVENTS`. Assume delivery can occur in another tab and avoid event
  echo loops.

## Code Conventions

- Import other workspaces only through package roots, for example
  `@bangle.io/ws-path`. Never use another package's `src` path or a relative
  path that crosses package boundaries.
- Declare every runtime and test dependency in the owning package's
  `package.json`; workspace packages use `workspace:*`. Use the maintenance
  scripts for mechanical dependency updates, then inspect their diff.
- Keep strict TypeScript intact. Do not add `any`, `as any`, blanket assertions,
  or lint suppressions. Accept `unknown` at genuine external boundaries, then
  narrow it with validation or type guards.
- New React component filenames are kebab-case. Existing legacy casing is not a
  pattern to copy.
- Use the global `t` object for user-visible app strings; do not import `t` in
  application or UI modules. Add English keys in
  `packages/shared/translations/src/languages/en.ts`. Bootstrap/tooling code
  that installs translations may import the translations package.
- Prefer existing ShadCN primitives and UI packages. Keep `ui` components
  presentational and move application behavior to `core`.
- Keep public command and service APIs typed and documented. Preserve useful
  existing comments unless the code they describe is removed.
- Prefer small composable functions. Share behavior at the lowest valid layer,
  but do not generalize a single use case speculatively.
- Commit messages follow Conventional Commits, for example `feat: ...`,
  `fix: ...`, or `chore: ...`.
- Prefer `rg`/`rg --files` for repository searches and exclude `node_modules`,
  `dist`, and `build` from broad scans.

## Testing Conventions

- Unit tests use Vitest and normally live beside source in `__tests__` as
  `*.spec.ts` or `*.spec.tsx`.
- Browser E2E tests use `*.e2e.ts`; Playwright component tests use `*.ct.tsx`
  under `packages/tooling/e2e-tests/src`.
- Feature tests must exercise the workflow through user-observable controls and
  assert meaningful outcomes, not merely that the page renders. Use resilient
  role, label, or accessible-name locators; keep state isolated and
  deterministic; do not use arbitrary sleeps. Cover reload/persistence and the
  relevant failure or recovery path when the feature can affect user data.
- Prefer real memory services, fake IndexedDB, DI containers, and actual
  parsers over mocks. Test observable contracts rather than private calls.
- Data-path changes must cover failure and abort behavior, not only success.
  Storage changes should cover reload/persistence; editor changes should cover
  both Markdown output and visible editor behavior.
- Do not update snapshots merely to make a test pass. Inspect the rendered
  difference first.

## Common Commands

```bash
pnpm install                 # install the pinned PNPM workspace
pnpm start                   # Vite dev server (normally localhost:5173)
pnpm typecheck               # tsgo project-reference typecheck
pnpm lint                    # Biome check
pnpm lint:fix                # safe Biome fixes
pnpm custom-validation      # dependency/layer/package validation
pnpm test:ci                 # all Vitest tests once
pnpm vitest path/to/a.spec.ts # one Vitest file while iterating
pnpm build                   # production browser build
pnpm e2e:ci                  # Playwright E2E + component tests
pnpm e2e-ui-mode             # interactive E2E runner
pnpm storybook               # Storybook on port 6006
pnpm local-ci-check          # every root *:ci script
```

Custom repository maintenance runs with Bun from the root:

```bash
bun packages/tooling/custom-scripts/scripts/maintenance-all.ts
bun packages/tooling/custom-scripts/scripts/add-workspace-dep.ts
bun packages/tooling/custom-scripts/scripts/remove-unused-deps.ts
bun packages/tooling/custom-scripts/scripts/format-package-json.ts
bun packages/tooling/custom-scripts/scripts/validate-all.ts
```

`maintenance-all.ts` mutates dependencies before validating; do not run it as a
generic check, and always review its changes. `pnpm custom-format` only formats
workspace `package.json` files.

## Plans and Deployment

- For durable work notes under `plans/`, follow `plans/AGENTS.md`. Active plans
  describe intent, not necessarily current implementation; verify code and root
  scripts before relying on plan commands.
- Do not deploy unless explicitly requested. Production is Cloudflare Pages
  from the `production` branch of `kepta/bangle-io-2`; pushing only to the
  `bangle-io/bangle-io` origin does not update `https://app.bangle.io/`.
- Cloudflare configuration is external to this repository. `production` maps to
  `appEnv: production`; `main` and `staging` map to staging. Before pushing,
  verify the local branch, target remote, and remote `production` head.
- A production release requires `pnpm install`, `pnpm typecheck`, `pnpm build`,
  the relevant tests, committed Playwright coverage for every released feature,
  and remote/branch verification. Before pushing the release, use
  `playwright-cli` against the release candidate to exercise each affected
  feature and the persistence smoke: create a Browser workspace and note, edit
  it, reload, and verify the content remains. After deployment, repeat the smoke
  against `https://app.bangle.io/`, inspect browser console errors, and confirm
  the runtime build config reports `appEnv: production`,
  `deployBranch: production`, and the intended commit hash.
