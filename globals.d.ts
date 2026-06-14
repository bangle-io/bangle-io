// biome-ignore lint/complexity/noBannedTypes: <explanation>
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
// // biome-ignore lint/style/noVar: <explanation>
declare const t: DeepReadonly<import('@bangle.io/translations').Translations>;

// biome-ignore lint/style/noVar: <explanation>
declare var __BANGLE_BUILD_TIME_CONFIG__: string | undefined;
// biome-ignore lint/style/noVar: <explanation>
declare var __BANGLE_INJECTED_CONFIG__: string | undefined;

declare module '@storybook/react' {
  export type Decorator<TArgs = import('storybook/internal/types').StrictArgs> =
    import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').Decorator<TArgs>;
  export type Meta<TCmpOrArgs = import('storybook/internal/types').Args> =
    import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').Meta<TCmpOrArgs>;
  export type Preview =
    import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').Preview;
  export type StoryContext<
    TArgs = import('storybook/internal/types').StrictArgs,
  > =
    import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').StoryContext<TArgs>;
  export type StoryObj<
    TMetaOrCmpOrArgs = import('storybook/internal/types').Args,
  > =
    import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').StoryObj<TMetaOrCmpOrArgs>;
  export const composeStories: typeof import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').composeStories;
  export const composeStory: typeof import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').composeStory;
  export const setProjectAnnotations: typeof import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/index').setProjectAnnotations;
}

declare module '@storybook/react/experimental-playwright' {
  export const createTest: typeof import('./packages/tooling/e2e-tests/node_modules/@storybook/react/dist/playwright').createTest;
}

declare module '@storybook/react-vite' {
  export type StorybookConfig =
    import('./packages/tooling/storybook/node_modules/@storybook/react-vite/dist/index').StorybookConfig;
}

declare module 'storybook/internal/types' {
  export type Args =
    import('./packages/tooling/storybook/node_modules/storybook/dist/types/index').Args;
  export type StoriesEntry =
    import('./packages/tooling/storybook/node_modules/storybook/dist/types/index').StoriesEntry;
  export type StrictArgs =
    import('./packages/tooling/storybook/node_modules/storybook/dist/types/index').StrictArgs;
}

declare module 'storybook/preview-api' {
  export const createPlaywrightTest: typeof import('./packages/tooling/storybook/node_modules/storybook/dist/preview-api/index').createPlaywrightTest;
}

declare module 'storybook/test' {
  export const fn: typeof import('./packages/tooling/storybook/node_modules/storybook/dist/test/index').fn;
}

// interface Window {
//   _nsmE2e: import('@bangle.io/e2e-types').E2eTypes;
//   _workerE2e: import('@bangle.io/e2e-types').WorkerE2eTypes;
// }

declare module 'page-lifecycle' {
  import type {
    PageLifeCycleState,
    PageLifeCycleEvent,
  } from '@bangle.io/types';

  interface Lifecyle {
    state: PageLifeCycleState;
    addUnsavedChanges: (s: symbol) => void;
    removeUnsavedChanges: (s: symbol) => void;
    addEventListener: (
      type: string,
      cb: (event: PageLifeCycleEvent) => void,
    ) => void;
    removeEventListener: (
      type: string,
      cb: (event: PageLifeCycleEvent) => void,
    ) => void;
  }

  let z: Lifecyle;
  export default z;
}
