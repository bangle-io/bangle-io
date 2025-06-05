## Contributing

**pnpm**

This project uses pnpm for package management. Ensure you have pnpm installed. If not, you can typically install it via npm:

```bash
npm install -g pnpm
```

Then, enable corepack (if not already enabled) and install dependencies:

```bash
corepack enable
corepack prepare --activate
pnpm install
```

## Repository Overview

The repository is a PNPM monorepo with multiple workspaces defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/core/*'
  - 'packages/platform/*'
  - 'packages/js-lib/*'
  - 'packages/shared/*'
  - 'packages/tooling/*'
  - 'packages/ui/*'
```

The project's goals and workspace layout are described in `RANT.md`. It explains that the repo contains several workspaces—`tooling`, `core`, `platform`, `ui`, `shared`, and `js-lib`—each with specific responsibilities and dependency rules.

## Key Packages

### Core

Contains the main application logic. Examples include the React App component and services:

- `packages/core/app` – React pages and layout.
- `packages/core/editor` – WYSIWYG editor built on ProseMirror.
- `packages/core/initialize-services` – Bootstraps all services through a dependency‑injection container. Services include routers, command dispatchers, workspace operations, etc.

### Platform

Holds platform-specific implementations, e.g., a browser router.

- `packages/platform/service-platform/src/browser-router.ts` handles URL parsing with a routing strategy and page lifecycle events.

### UI

Pure UI components.

- `packages/ui/ui-components` provides React components such as `Breadcrumb`, `ToggleGroup`, etc.

### Shared

Shared constants, commands, and types. Constants include service names, routes, and config options.

### JS‑Lib

Generic utilities such as an event Emitter, mini validation helpers (mini-zod), and browser utilities. Example: typed broadcast channel for cross‑tab communication.

### Tooling

Contains build and development utilities (vite configs, custom scripts, testing helpers).

- `packages/tooling/browser-entry` bootstraps the app in the browser.

## Core Concepts

- **Dependency Injection**: A custom dependency-injection container (`poor-mans-di`) manages services.
- **Event System**: `root-emitter` provides a scoped event emitter used across tabs and services.
- **Workspace Paths**: The `ws-path` library validates and manipulates workspace paths, ensuring operations on files and directories behave consistently.

## Getting Started

**1. Install dependencies**

```bash
pnpm install
```

**2. Run the app**

```bash
pnpm start
```

The development instance will be available on `localhost:4000`.

**3. Explore the Codebase**

- Explore the services setup in `packages/core/initialize-services`.
- Look at UI components under `packages/ui/` to understand the styling and design patterns.
- Review utility libraries (under `packages/js-lib/`) to see how events, broadcast channels, and validation are implemented.
- Check `packages/shared/commands/` for the command architecture used throughout the app.
- Read the architecture notes in `RANT.md` for the big-picture design goals.

**Run all CI checks locally (Recommended)**

```bash
pn biome check --fix --unsafe && pn local-ci-check
```

**Typecheck**

```bash
pnpm tsc -b -w
```

**Run all tests**

```bash
pnpm vitest
```

**Snapshot test update**

If you are in mac, you will need to run docker to update the snapshots.
Note: The command for `CT Snapshot update (docker)` uses `v1.52.0-noble`. Please ensure this is the version you intend to use or update it if a newer stable version is available.

CT Snapshot update (local)

```bash
pnpm run e2e-ct-update-snapshots
```

CT Snapshot update (docker)

```bash
docker run -p 9323 -v $(pwd):/work/ mcr.microsoft.com/playwright:v1.52.0-noble bash -c 'cd work && corepack enable && corepack prepare --activate  && pnpm install  && pnpm run e2e-install && NODE_OPTIONS="--max-old-space-size=8144" pnpm run e2e-ct-update-snapshots'
```

Aria snapshot update

```bash
pnpm e2e-update-snapshots
```

**Run in playwright debug mode**

```bash
pnpm --filter "@bangle.io/e2e-tests" run test --debug
```

**Deployment**

App is deployed via cloudflare pages.

Push to `staging` branch will deploy to https://staging.app.bangle.io/

Push to `production` branch will deploy to https://app.bangle.io/
