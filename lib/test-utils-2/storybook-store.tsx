import type { Decorator, StoryContext } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { NsmStoreContext } from '@bangle.io/bangle-store-context';
import type { NsmStore } from '@bangle.io/shared-types';

import type { TestStoreOpts } from './test-store';
import { setupTestStore } from './test-store';

export type StorybookStoreOpts = Omit<TestStoreOpts, 'abortSignal'>;

// see the global storybook preview.tsx file where set
// the parameter 'nsmContextKey'
const storybookContextMap = new WeakMap<object, NsmStore>();

export function getStoreFromStorybookContext(ctx: StoryContext<any>): NsmStore {
  return storybookContextMap.get(ctx.parameters.nsmContextKey)!;
}

export function StorybookStore(props: {
  children: React.ReactNode;
  opts: StorybookStoreOpts;
  ctx: StoryContext<any>;
}) {
  const [abortController] = useState(() => new AbortController());
  useEffect(() => {
    return () => {
      abortController.abort();
    };
  }, [abortController]);

  const [testStore] = useState(() => {
    const testStore = setupTestStore({
      ...props.opts,
      abortSignal: abortController.signal,
    });
    storybookContextMap.set(
      props.ctx.parameters.nsmContextKey,
      testStore.testStore,
    );

    return testStore;
  });

  return (
    <NsmStoreContext.Provider value={testStore.testStore}>
      {props.children}
    </NsmStoreContext.Provider>
  );
}
export const storybookStoreDecorator = (
  opts: StorybookStoreOpts,
): Decorator => {
  return (Story, ctx) => {
    return (
      <StorybookStore opts={opts} ctx={ctx}>
        <Story />
      </StorybookStore>
    );
  };
};
