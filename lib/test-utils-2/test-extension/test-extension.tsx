import React from 'react';

import { _SerialOperationContextProvider, nsmApi2 } from '@bangle.io/api';
import { NsmStoreContext } from '@bangle.io/bangle-store-context';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import type { EternalVars } from '@bangle.io/shared-types';

import type { CoreOpts, TestStoreOpts } from '../test-store';
import { DEFAULT_CORE_OPTS, setupTestStore } from '../test-store';

type TestExtensionOpts = Pick<
  TestStoreOpts,
  'effects' | 'slices' | 'abortSignal' | 'extensions' | 'storeName'
> & {
  renderEditorComponent?: boolean;
  core?: Partial<CoreOpts>;
};

export function setupTestCtx(opts: TestExtensionOpts) {
  const finalOpts: CoreOpts = {
    ...DEFAULT_CORE_OPTS,
    page: true,
    workspace: true,
    worker: true,
    ...(opts.core || {}),
  };

  if (!finalOpts.editor && opts.renderEditorComponent) {
    throw new Error(
      'setupTestCtx: renderEditorComponent can only be true if editor is true',
    );
  }

  const testStore = setupTestStore({
    ...opts,
    core: finalOpts,
  });

  return {
    ...testStore,
    ContextProvider: function ContextProvider(props: {
      children: React.ReactNode;
    }) {
      return (
        <NsmStoreContext.Provider value={testStore.testStore}>
          <_SerialOperationContextProvider>
            {props.children}
            {opts.renderEditorComponent ? (
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
