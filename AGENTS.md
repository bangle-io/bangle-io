# Project Instructions

Tech Stack

bangel.io is an opensource local browser based note taking web app.

- PNPM
- React
- TypeScript
- Vite
- Vitest
- Playwright
- TailwindCSS
- ShadCN
- Jotai for state management

## Project Structure

1. **core**: Business logic and the main bread and butter of the app.
2. **platform**: Platform-specific abstractions (e.g., IndexedDB for browser).
3. **shared**: Shared code, types, constants.
4. **tooling**: Build tools and scripts.
5. **ui**: React components, somewhat business logic agnostic.
6. **js-lib**: Independent business lgoic agnostic packages.

## Guidelines

- Write complete code; avoid shortcuts.
- Avoid deleting existing code comments unless explicitly instructed to remove.
- React components use kebab case for file names.
- Prefer to write modular, functional and reusable code.
- Prefer KISS over DRY.
- Avoid writing unsafe typescript code that leverages `as any` or other lint suppresions.
- Mocking/stubbing is not good and prefer using real stuff when writing unit tests.
- project is a monorepo with many `@bangle.io/*` packages.
- For `@bangle.io/*` packages, we PREFER importing like this `import {x} from @bangle.io/mini-js-utils` and we AVOID importing paths `import {x} from @bangle.io/mini-js-utils/src/some-path`.
- DONOT `cd ` into a package to run tests or lint, instead run the commands like `pnpm test:ci` or `pnpm lint:ci` from the `root`.

## Running tests and other commands

We have a monorepo structure, so tests or any scripts should be run from root. See the @package.json scripts the find relevant test

## WsPath Format

`wsPath` defines file or directory paths in the workspace:

@ws-path.ts

The wsPath string has this convention:

- **File**: `<workspaceName>:<filePath>` (e.g., `myWorkspace:myNote.md`)
- **Directory**: `<workspaceName>:<dirPath>` (e.g., `myWorkspace:myDir/mySubDir`)

### terminolgies:

- `workspaceName`: Workspace name aka `wsName`.
- `filePath`: File path with extension.
- `dirPath`: Directory path.

## UI components

We use shadcn and tailwind. All UI components must not have any dependency on the rest the code, except for `ui` packages itself, `js-lib` or packages in the `packages/shared` directory.

Where possible try to reuse existing components, extend them and promote reuse. Try to follow conventions of existing compnents.

## Commands

Bangle uses commands to perform actions. The commands serializable config is in the `@bangle.io/commands` package and the command handlers are in the `@bangle.io/command-handlers` package.

Below is a command config:

```
 {
    id: 'command::ui:toggle-sidebar',
    title: 'Toggle Sidebar',
    keywords: ['toggle', 'sidebar'],
    dependencies: {
      services: ['workbenchState'],
    },
    omniSearch: true,
    keybindings: ['meta', '\\'],
    args: null,
  }
```

- ID is kebab case
- Example file for command config @ui-commands.ts

Below is an example of a command handler

```
  c('command::ui:toggle-sidebar', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  })
```

Example file for implementation of config @ui-command-handlers.ts

## Services

Services encapsulate the core logic, we have following directories

- service-core

  - can depend on platform services
  - example @navigation-service.ts @workspace-service.ts , Editor service @editor-service.ts

- service-platform
  - CANNOT depend on service-core or any other higher level.
  - Can only depend on other platform services.
  - Example @memory-database.ts , @file-storage-indexeddb.ts

Each service should only depend on another service if it is absolutely needed, otherwise take advantage of config constructor param to pass in a callback for a decoupled way of making a service depend on another.

## Translation

We have translation that is globally available as variable `t`. If you are editing user facing text make sure you update @en.ts with correct translation id.
