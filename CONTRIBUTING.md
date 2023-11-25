# Contributing Guide

Welcome to Bangle.io's contributing guide!

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.15.0 or higher)
- [pnpm](https://pnpm.io/) (v6.14.0 or higher)

### Installation

1. Clone the repository:

```sh
git clone git@github.com:bangle-io/bangle-io.git
```

1. Install dependencies:

```sh
pnpm install
```

1. Start the development server:

```sh
pnpm run start
```

1. Run tests:

```sh
pnpm run test
```

1. Run linting:

```sh
pnpm run lint
```

1. Run e2e tests (ensure you have [playwright](https://playwright.dev/) installed):
  
```sh
pnpm run test:e2e
```


## Inline Scripts

Location: `packages/app-bundler/inline-scripts`.

### Overview

Scripts are bundled using tsup and placed in the `public` directory of `app-root` for Vite to inline into the `index.html` file.

### Best Practices

- Keep scripts lean to avoid inlining entire libraries.
- Limit inline scripts to critical elements that benefit from early loading, such as theme type and widescreen settings.
- Avoid adding non-essential code to inline scripts as they are challenging to debug.

## Styling

### CSS Variables Generation

To generate CSS variables, run the following commands:

```sh
# at the root of the project
pnpm run generate-all

# Or in @bangle.io/ui-theme
pnpm run generate:css-vars
```

The generated file will be located in app/app-root/public.

## Useful Development Tools

This section outlines some essential tools that can enhance your development workflow in this project.

### Syncpack

[Syncpack](https://github.com/JamieMason/syncpack) provides utilities to manage and standardize `package.json` files in your project. Key commands include:

- **Format Package Files**: Run `npx syncpack format` to format `package.json` files consistently.
- **Update Dependencies**: Use `npx syncpack update` for an interactive update of all dependencies.

### Package Generation with PlopJS

For streamlined package creation, we use [PlopJS](https://plopjs.com/documentation/), a tool that provides a simple way to generate files and components. To create a new library package, execute:

```sh
npx plop lib
```


## Worker / Naukar

> Note: In our documentation and code, `naukar` and `worker` are used interchangeably to refer to [worker threads](https://developer.mozilla.org/en-US/docs/Web/API/Worker).


### Worker Architecture

The architecture for worker threads in our project is organized as follows:

1. **Location of Worker Code**: The main worker code resides in `packages/app-worker`. The code for setting up the worker, is located in `package/app-bundler` in package `@bangle.io/setup-worker`.

2. **Communication**: We use proxies for bi-directional communication between the main thread and worker threads.

3. **Global Accessibility**: Worker methods are globally accessible in **window** through `eternalVars.naukar.<method>`.

4. **State Synchronization**: The state of the window is synchronized in a one-way flow (main -> worker) using `json-patch` and `immer`. This synchronization allows for consistent state management across threads.

5. **State Access in Worker**: Worker code can access this synchronized state through the `slice-window-state`.

6. **Modifying Window State**: To change the state of the window, worker code can utilize `WindowActions`.

### Exposing a new Store Fields to Worker

To sync new fields in the store with the worker, follow these steps:

1. **Update Store Replica**: Modify the `WorkerWindowStoreReplica` in `@bangle.io/shared-types` to reflect the new fields.

1. **Add Field to Effects**: In `packages/app-window/window-store/slices/sync-with-worker.ts`, add the new field to the effects for synchronization.

1. **Expose New State to Worker**: In `packages/app-worker/naukar-store/slices/slice-window-state.ts`, include the new field to make the updated state available to the worker.
