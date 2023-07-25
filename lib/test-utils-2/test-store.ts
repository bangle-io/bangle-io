import type { Extension } from '@bangle.io/extension-registry';
import {
  extensionRegistryEffects,
  nsmExtensionRegistry,
} from '@bangle.io/extension-registry';
import type { AnySlice, EffectCreator, SliceId } from '@bangle.io/nsm-3';
import {
  nsmSliceWorkspace,
  nsmWorkspaceEffects,
} from '@bangle.io/nsm-slice-workspace';
import { setupStore } from '@bangle.io/setup-store';
import type { EternalVars } from '@bangle.io/shared-types';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { nsmPageSlice } from '@bangle.io/slice-page';
import {
  refreshWorkspace,
  sliceRefreshWorkspace,
} from '@bangle.io/slice-refresh-workspace';
import { nsmUISlice, uiEffects } from '@bangle.io/slice-ui';

import { testEternalVars } from './test-eternal-vars';

type CoreOpts = {
  editorManager: boolean;
  ui: boolean;
  page: boolean;
  workspace: boolean;
  stateOverride: (base: Record<SliceId, any>) => Record<SliceId, any>;
};

const DEFAULT_CORE_OPTS: CoreOpts = {
  editorManager: false,
  ui: true,
  page: false,
  workspace: false,
  stateOverride: (s) => s,
};

export type TestStoreOpts = {
  slices?: AnySlice[];
  effects?: EffectCreator[];
  extensions?: Extension[];
  abortSignal: AbortSignal;
  core?: Partial<CoreOpts>;
};

const getStuff = (
  eternalVars: EternalVars,
  opts: CoreOpts,
): {
  slices: AnySlice[];
  effects: EffectCreator[];
} => {
  let slices: AnySlice[] = [nsmExtensionRegistry];
  let effects: EffectCreator[] = [...extensionRegistryEffects];

  if (opts.page) {
    slices.push(nsmPageSlice);
  }

  if (opts.editorManager) {
    slices.push(nsmEditorManagerSlice);
  }

  if (opts.workspace) {
    slices.push(sliceRefreshWorkspace, nsmSliceWorkspace);
    effects.push(...nsmWorkspaceEffects);
  }

  if (opts.ui) {
    slices.push(nsmUISlice);
    effects.push(...uiEffects);
  }

  return {
    slices: [...slices, ...eternalVars.extensionRegistry.getNsmSlices()],
    effects: [...effects, ...eternalVars.extensionRegistry.getNsmEffects()],
  };
};

export function setupTestStore(_opts: TestStoreOpts) {
  const coreOpts: CoreOpts = {
    ...DEFAULT_CORE_OPTS,
    ..._opts.core,
  };
  const extensions = _opts.extensions ?? [];

  const eternalVars = testEternalVars({
    extensions: extensions,
  });

  const { slices, effects } = getStuff(eternalVars, coreOpts);

  const debugLog = typeof jest === 'undefined' ? () => {} : jest.fn();

  const initStateOverride: Record<string, any> = {
    [nsmExtensionRegistry.sliceId]: {
      extensionRegistry: eternalVars.extensionRegistry,
    },
  };

  const testStore = setupStore({
    type: 'test',
    slices: [...slices, ...(_opts.slices ?? [])],
    effects: [...effects, ...(_opts.effects ?? [])],
    eternalVars,
    onRefreshWorkspace: (store) => {
      store.dispatch(refreshWorkspace(), {
        debugInfo: 'test-storage-provider-change',
      });
    },
    otherStoreParams: {
      debug: debugLog,
      stateOverride: coreOpts.stateOverride(initStateOverride),
    },
  });

  _opts.abortSignal.addEventListener(
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
