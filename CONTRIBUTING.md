# Bangle.io Contributing Guide


## Initial Setup

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org/en/) (version 18.15.0 or later).
- Install [pnpm](https://pnpm.io/) (version 6.14.0 or above).

### Installation Steps

1. **Repository Cloning**:

```sh
git clone git@github.com:bangle-io/bangle-io.git
   ```

2. **Dependencies Installation**:

```sh
pnpm install
```

3. **Starting the Development Server**:

```sh
pnpm run start
```

4. **Running Tests**:
```sh
pnpm run test
```

5. **Executing Linting**:
```sh
pnpm run lint
```

6. **Running End-to-End Tests** (Requires [playwright](https://playwright.dev/)):
```sh
pnpm run test:e2e
```

## Inline Scripts

### Location

Scripts are located at: `packages/app-bundler/inline-scripts`.

### Overview

Scripts are bundled with tsup and positioned in the `public` folder of `app-root` for Vite to embed into `index.html`.

### Best Practices

- Focus on minimal script size to avoid inlining entire libraries.
- Restrict inline scripts to crucial elements that benefit from early loading.
- Refrain from adding non-essential code for easier debugging.

## Styling

### CSS Variables Generation

Generate CSS variables using the commands:

- For the entire project:

```sh
pnpm run generate-all
```

- Specifically for @bangle.io/ui-theme:

```sh
pnpm run generate:css-vars
```

Generated files are located in `app/app-root/public`.

## Useful Development Tools

### Syncpack

[Syncpack](https://github.com/JamieMason/syncpack) assists in managing `package.json` files.

- **Format Package Files**: 

```sh
npx syncpack format
```

- **Update Dependencies**: 

```sh
npx syncpack update
```

### Package Generation with PlopJS

[PlopJS](https://plopjs.com/documentation/) simplifies file and component generation.

- To create a new library package:

```sh
npx plop lib
```

## Worker / Naukar

> Note: 'naukar' and 'worker' are synonymous in our context, referring to [worker threads](https://developer.mozilla.org/en-US/docs/Web/API/Worker).

### Worker Architecture

1. **Worker Code Location**: Main code in `packages/app-worker`, setup in `package/app-bundler` under `@bangle.io/setup-worker`.
2. **Communication**: Bi-directional communication through proxies.
3. **Global Accessibility**: Access worker methods globally via `eternalVars.naukar.<method>`.
4. **State Synchronization**: One-way synchronization from main to worker using `json-patch` and `immer`.
5. **State Access**: Access synchronized state in worker through `slice-window-state`.
6. **Modifying Window State**: Use `WindowActions` for state alterations.

### Exposing New Store Fields to Worker

1. **Update Store Replica**: Modify `WorkerWindowStoreReplica` in `@bangle.io/shared-types` for new fields.
2. **Field Inclusion in Effects**: Add fields in `packages/app-window/window-store/slices/sync-with-worker.ts` for sync.
3. **Expose to Worker**: Include new state in `packages/app-worker/naukar-store/slices/slice-window-state.ts`.

## Debug Flags

Debug flags are used to enable/disable certain features in the app for testing purposes only. You can set them by adding url search params.

```js
searchParams = new URLSearchParams(window.location.search);
searchParams.set('debug_flags', JSON.stringify({ 
    testShowAppRootSetupError: true 
}));

// copy this and use it in the url
console.log(searchParams.toString())

```

## Database

By default bangle uses indexeddb (`@bangle.io/app-database-indexeddb`) as the database for core application database needs. 

It is however pluggable and you can write your own database adapter. See `@bangle.io/app-database-in-memory` for example of a in-memory database adapter. You can force the app to use this by setting `debugFlags.testAppDatabase = 'in-memory'`.

