import type { Decorator, Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { NsmStoreContext } from '@bangle.io/bangle-store-context';

import type { TestStoreOpts } from './test-store';
import { setupTestStore } from './test-store';

export type StorybookStoreOpts = Omit<TestStoreOpts, 'abortSignal'>;

export function StorybookStore(props: {
  children: React.ReactNode;
  opts: StorybookStoreOpts;
}) {
  const [abortController] = useState(() => new AbortController());

  useEffect(() => {
    return () => {
      abortController.abort();
    };
  }, [abortController]);

  const [testStore] = useState(() =>
    setupTestStore({ ...props.opts, abortSignal: abortController.signal }),
  );

  return (
    <NsmStoreContext.Provider value={testStore.testStore}>
      {props.children}
    </NsmStoreContext.Provider>
  );
}
export const storybookStoreDecorator = (
  opts: StorybookStoreOpts,
): Decorator => {
  return (Story) => {
    return (
      <StorybookStore opts={opts}>
        <Story />
      </StorybookStore>
    );
  };
};
