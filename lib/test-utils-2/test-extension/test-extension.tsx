import React from 'react';

import { NsmStoreContext } from '@bangle.io/bangle-store-context';

import type { TestStoreOpts } from '../test-store';
import { setupTestStore } from '../test-store';
import * as utils from './utils';

type TestExtensionOpts = Pick<
  TestStoreOpts,
  'effects' | 'slices' | 'abortSignal' | 'extensions' | 'storeName'
> & {
  editor?: boolean;
};

export function setupTestExtension(opts: TestExtensionOpts) {
  const testStore = setupTestStore({
    ...opts,
    core: {
      editorManager: opts.editor,
      page: true,
      ui: true,
      workspace: true,
      worker: true,
    },
  });

  return {
    ...testStore,
    ...utils,
    ContextProvider: function ContextProvider(props: {
      children: React.ReactNode;
    }) {
      return (
        <NsmStoreContext.Provider value={testStore.testStore}>
          {props.children}
        </NsmStoreContext.Provider>
      );
    },
  };
}
