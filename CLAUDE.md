# Contributing & Development Guide

## **Bangle.io** is a modern, local‑first, web‑based note‑taking platform that stores notes as Markdown while offering a WYSIWYG experience.

## About the Project

Bangle.io is a **local‑first** note‑taking app that persists notes to the browser’s file‑system (IndexedDB / Native File System API) while giving users a seamless, rich‑text editing experience via **ProseMirror** and **bangle.dev**.

---

## Tech Stack

- **Package manager:** PNPM (monorepo)
- **Framework/UI:** React + TailwindCSS + ShadCN
- **Language:** TypeScript (strict)
- **Bundler:** Vite
- **State:** Jotai
- **E2E / CT:** Playwright
- **Unit tests:** Vitest
- **Lint / Format:** Biome & custom scripts

---

## Repository Layout

The monorepo is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/core/*'
  - 'packages/platform/*'
  - 'packages/shared/*'
  - 'packages/ui/*'
  - 'packages/js-lib/*'
  - 'packages/tooling/*'
```

### Workspace Hierarchy

Lower layers must never import from higher layers. The hierarchy is enforced via `bangleWorkspaceConfig.allowedWorkspaces` in each workspace's parent `package.json`.

| Level | Workspace     | Can depend on                         | Purpose                           |
| ----- | ------------- | ------------------------------------- | --------------------------------- |
| 1     | **tooling/**  | any workspace (`["*"]`)               | Build tools, dev utilities, tests |
| 2     | **core/**     | platform, ui, shared, js-lib, tooling | Main app logic, business rules    |
| 3     | **platform/** | shared, js-lib                        | Platform-specific implementations |
| 3     | **ui/**       | shared, js-lib                        | Pure UI components (ShadCN)       |
| 4     | **shared/**   | js-lib                                | Cross-workspace shared code       |
| 5     | **js-lib/**   | (none)                                | Foundation utilities              |

**Note:** `platform` and `ui` are at the same dependency level – they can both only depend on `shared` and `js-lib`.

---

## Development Commands

```bash
pnpm install           # Install all dependencies
pnpm start             # Dev server (http://localhost:4000)

pnpm build             # Production build

pnpm lint              # Lint with Biome
pnpm lint:fix          # Auto‑fix lint issues
pnpm custom-format     # Format all files (prettier rules via Biome)

pnpm typecheck         # TypeScript project references
pnpm tsc -b -w         # Type‑check in watch mode

pnpm test:ci           # All unit tests (CI mode)
pnpm vitest            # Unit tests in watch mode

pnpm e2e:ci            # Playwright E2E & component tests
pnpm e2e-ui-mode       # Playwright UI mode

# One‑off unit test
pnpm vitest path/to/file.spec.ts

# Recommended before every commit
pnpm biome check --fix --unsafe && pnpm local-ci-check
```

---

## Monorepo Dependency Rules

1. **Import by package**, never by relative path:

   ```ts
   // ✅ Good
   import { isNil } from '@bangle.io/mini-js-utils';
   // ❌ Bad
   import { isNil } from '@bangle.io/mini-js-utils/src/is-nil';
   ```

2. Run all commands from the **repo root** – never `cd` into a workspace.
3. Type safety is non‑negotiable: avoid `any` and unsafe `as` assertions.
4. Mocking is discouraged; prefer real implementations in tests.
5. React component file names use **kebab‑case**.

---

## Code & UI Guidelines

- Write complete code; avoid shortcuts.

- React components use kebab case for file names.
- Prefer to write modular, functional and reusable code.
- Prefer KISS over DRY.
- Avoid writing unsafe typescript code that leverages `as any` or other lint suppresions.
- Mocking/stubbing is not good and prefer using real stuff when writing unit tests.
- project is a monorepo with many `@bangle.io/*` packages.
- Whenever you are running commands like `find` or similar commands be mindful of `node_modules` and ignore it as pnpm can create deeply nested `node_modules`.
- Most packages are named `@bangle.io/<dir-name>`. So for example the path `packages/core/app` is `@bangle.io/app`.
- We use imports like `import { isNil } from '@bangle.io/mini-js-utils';` AND NOT of imports like `import { isNil } from '@bangle.io/mini-js-utils/src/is-nil';` or path imports like `import { isNil } from '../../mini-js-utils/is-nil';`.
- We use the global `t` object for translations. That is defined in `@bangle.io/translations` package. DONOT do an import of `t` as it is global.

### Code Style

- Strict TypeScript (`noUncheckedIndexedAccess`, no `as any`, no `any`).
- Keep functions small and composable (_KISS > DRY_).
- Leave existing comments intact unless explicitly asked to remove them.
- Command IDs are kebab‑case (`command::ui:toggle-sidebar`).

### UI Components

- Live in `packages/ui/*`.
- Pure presentational components: may depend only on `ui`, `shared`, `js-lib`.
- Re‑use and extend ShadCN components when possible.

### WsPath Format

A `wsPath` uniquely identifies a resource inside a workspace:

```
<workspaceName>:<fileOrDirPath>
```

Examples:

- File: `myWorkspace:note.md`
- Directory: `myWorkspace:folder/sub`

### Services & DI

- Implemented with `poor-mans-di`.
- Two service layers:

  - **service-core** (may call platform services)
  - **service-platform** (MUST NOT import from core)

- Pass dependencies via constructor config for loose coupling.

### Command System

- Serializable configs live in `@bangle.io/commands`.
- Implementations live in `@bangle.io/command-handlers`.

### Event System

- `root-emitter` provides scoped, cross‑tab event handling.

### State Management

- **Jotai** atoms are the single source of React state.

---

## Architectural Concepts

| Concept              | Package / Tool                                       |
| -------------------- | ---------------------------------------------------- |
| WYSIWYG Editor       | `packages/core/editor` – ProseMirror + bangle.dev    |
| File System          | `baby-fs` + browser adapters (IndexedDB / Native FS) |
| Commands             | `@bangle.io/commands`, `@bangle.io/command-handlers` |
| Dependency Injection | `@bangle.io/poor-mans-di`                            |
| Event Emitter        | `@bangle.io/root-emitter`                            |
| Utilities            | `@bangle.io/mini-js-utils`                           |

---

## Testing Strategy

| Test Type | Tool           | Script           |
| --------- | -------------- | ---------------- |
| Unit      | **Vitest**     | `pnpm vitest`    |
| Component | **Playwright** | part of `e2e:ci` |
| E2E       | **Playwright** | `pnpm e2e:ci`    |

**Snapshot updates** (local):

```bash
pnpm run e2e-ct-update-snapshots
```

**Snapshot updates** (Docker, Apple Silicon‑friendly):

```bash
docker run -p 9323 -v $(pwd):/work/ mcr.microsoft.com/playwright:v1.52.0-noble \
  bash -c 'cd /work && corepack enable && corepack prepare --activate && \
  pnpm install && pnpm run e2e-install && \
  NODE_OPTIONS="--max-old-space-size=8144" pnpm run e2e-ct-update-snapshots'
```

Debug E2E:

```bash
pnpm --filter "@bangle.io/e2e-tests" run test --debug
```

---

## TypeScript

- Avoid using `any` and `unknown` types.
- Avoid using `as` assertions.

## Translations

All user‑visible strings must be wrapped in the global `t` function.
Add new keys to `packages/shared/translations/src/languages/en.ts`.

---

## Custom Maintenance Scripts

All scripts live in `packages/tooling/custom-scripts/scripts/` and run with **Bun**.

| Purpose                               | Script                           |
| ------------------------------------- | -------------------------------- |
| Run **all** maintenance (recommended) | `bun maintenance-all.ts`         |
| Remove unused deps                    | `bun remove-unused-deps.ts`      |
| Add missing workspace deps            | `bun add-workspace-dep.ts`       |
| Format all `package.json`             | `bun format-package-json.ts`     |
| Validate workspace rules              | `bun validate-all.ts`            |
| Generate CSS themes                   | `bun css-theme-gen.ts input.css` |

---

## Running & Building

```bash
# Install once
pnpm install

# Start dev server (http://localhost:4000)
pnpm start

# Production build
pnpm build
```

Type‑checking in watch mode:

```bash
pnpm tsc -b -w
```

---

## Deployment

- **staging** branch → [https://staging.app.bangle.io/](https://staging.app.bangle.io/)
- **production** branch → [https://app.bangle.io/](https://app.bangle.io/)
  Deployment is handled automatically by **Cloudflare Pages** on push.

---

## Pull‑Request Checklist

1. `pnpm biome check --fix --unsafe && pnpm local-ci-check` passes locally.
2. No forbidden cross‑layer imports
3. Unit, component, and E2E tests are green.
4. New UI text is translated.
5. Public APIs (commands, services) include documentation comments.
6. No `any` casts remain.
7. Commit message follows Conventional Commits (`feat: ...`, `fix: ...`, etc.).

---

> **Need help?** Join the discussion in `#bangle-dev` on [Discord](https://discord.com/invite/GvvbWJrVQY) or open a draft PR and ask questions there.
