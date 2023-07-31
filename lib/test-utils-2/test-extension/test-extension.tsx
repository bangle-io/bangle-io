import React from 'react';

import { _SerialOperationContextProvider, nsmApi2 } from '@bangle.io/api';
import { NsmStoreContext } from '@bangle.io/bangle-store-context';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import type { EternalVars } from '@bangle.io/shared-types';

import type { TestStoreOpts } from '../test-store';
import { setupTestStore } from '../test-store';
import * as utils from './utils';

type TestExtensionOpts = Pick<
  TestStoreOpts,
  'effects' | 'slices' | 'abortSignal' | 'extensions' | 'storeName'
> & {
  editor?: boolean;
  fullEditor?: boolean;
};

export function setupTestExtension(opts: TestExtensionOpts) {
  if (!opts.editor && opts.fullEditor) {
    throw new Error(
      'setupTestExtension: fullEditor can only be true if editor is true',
    );
  }

  const testStore = setupTestStore({
    ...opts,
    core: {
      editor: opts.editor,
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
          <_SerialOperationContextProvider>
            {props.children}
            {opts.fullEditor ? (
              <RenderEditor eternalVars={testStore.eternalVars} />
            ) : null}
          </_SerialOperationContextProvider>
        </NsmStoreContext.Provider>
      );
    },
  };
}

function RenderEditor({ eternalVars }: { eternalVars: EternalVars }) {
  const { primaryWsPath } = nsmApi2.workspace.useWorkspace();

  if (!primaryWsPath) {
    return null;
  }

  return (
    <Editor
      editorId={PRIMARY_EDITOR_INDEX}
      wsPath={primaryWsPath}
      eternalVars={eternalVars}
    />
  );
}
