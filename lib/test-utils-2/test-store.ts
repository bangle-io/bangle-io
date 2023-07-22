import type { Extension } from '@bangle.io/extension-registry';
import type { AnySlice } from '@bangle.io/nsm-3';
import { setupStore } from '@bangle.io/setup-store';

import { testEternalVars } from './test-eternal-vars';

export type TestExtensionOpts = {
  slices?: AnySlice[];
  extensions?: Extension[];
  abortSignal: AbortSignal;
  core?: {
    editorManager?: boolean;
    ui?: boolean;
  };
};

export function setupTestStore(_opts: TestExtensionOpts) {
  const finalOpts: Required<TestExtensionOpts> = {
    ..._opts,
    slices: _opts.slices ?? [],
    extensions: _opts.extensions ?? [],
    core: {
      editorManager: _opts.core?.editorManager ?? true,
      ui: _opts.core?.ui ?? true,
    },
  };

  const eternalVars = testEternalVars({
    extensions: finalOpts.extensions,
  });

  const debugLog = jest.fn();

  const testStore = setupStore({
    type: 'test',
    slices: finalOpts.slices,
    effects: [],
    eternalVars,
    onRefreshWorkspace: () => {},
    otherStoreParams: {
      debug: debugLog,
    },
  });

  finalOpts.abortSignal.addEventListener(
    'abort',
    () => {
      testStore.destroy();
    },
    {
      once: true,
    },
  );

  return {
    testStore,
  };
}
