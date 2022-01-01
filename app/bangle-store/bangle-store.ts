import lifecycle from 'page-lifecycle';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { editorManagerSlice } from '@bangle.io/editor-manager-context';
import * as editorManagerContext from '@bangle.io/editor-manager-context';
import type { BangleStateOpts, JsonValue } from '@bangle.io/shared-types';
import { uiSlice } from '@bangle.io/ui-context';
import {
  getEditorPluginMetadata,
  safeCancelIdleCallback,
  safeRequestAnimationFrame,
  safeRequestIdleCallback,
} from '@bangle.io/utils';
import * as workspaceContext from '@bangle.io/workspace-context';

import {
  BangleActionTypes,
  BangleSliceTypes,
  bangleStateSlices,
} from './bangle-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'bangle-store') : () => {};

const persistKey = 'bangle-store-0.124';

const SCHEMA_VERSION = 'bangle-store/1';

const MAX_DEFERRED_WAIT_TIME = 400;

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const stateOpts: BangleStateOpts = {
    lifecycle,
  };
  const makeStore = () => {
    const stateJson = {
      ...retrieveLocalStorage(),
      ...retrieveSessionStorage(),
    };

    const onPageInactive = () => {
      toLocalStorage(
        store.state.stateToJSON({
          sliceFields: {
            uiSlice: uiSlice(),
          },
        }),
      );
      toSessionStorage(
        store.state.stateToJSON({
          sliceFields: {
            editorManagerSlice: editorManagerSlice(),
          },
        }),
      );
    };

    let state = AppState.stateFromJSON({
      slices: bangleStateSlices({
        onUpdate,
        onPageInactive,
      }),
      json: stateJson,
      sliceFields: {
        uiSlice: uiSlice(),
        editorManagerSlice: editorManagerSlice(),
      },
      opts: stateOpts,
    });

    return ApplicationStore.create<BangleSliceTypes, BangleActionTypes>({
      storeName: MAIN_STORE_NAME,
      state: state,
      dispatchAction: (store, action) => {
        log(action);
        const newState = store.state.applyAction(action);
        store.updateState(newState);
        log('finished', action.name, action.id);
      },
      scheduler: scheduler(),
    });
  };

  let store = makeStore();
  // for e2e testing
  (window as any).appStore = store;
  (window as any)._getWsPaths = () =>
    workspaceContext.workspaceSliceKey.getSliceState(store.state)?.wsPaths;
  (window as any)._pushWsPath = (wsPath: string) =>
    workspaceContext.pushWsPath(wsPath)(store.state, store.dispatch);

  (window as any)._getEditorPluginMetadata = getEditorPluginMetadata;

  (window as any)._getEditors = () =>
    editorManagerContext.editorManagerSliceKey.getSliceState(store.state)
      ?.editors;

  return store;
}

function toLocalStorage(obj: JsonValue) {
  localStorage.setItem(
    persistKey,
    JSON.stringify({ data: obj, schema: SCHEMA_VERSION }),
  );
}

function toSessionStorage(obj: JsonValue) {
  sessionStorage.setItem(
    persistKey,
    JSON.stringify({ data: obj, schema: SCHEMA_VERSION }),
  );
}

function retrieveLocalStorage(): any {
  try {
    const item = localStorage.getItem(persistKey);
    if (typeof item === 'string') {
      const val = JSON.parse(item);
      if (val.schema === SCHEMA_VERSION) {
        return val.data;
      }
      return {};
    }
  } catch (error) {
    console.error(error);
  }
  return {};
}

function retrieveSessionStorage(): any {
  try {
    const item = sessionStorage.getItem(persistKey);
    if (typeof item === 'string') {
      const val = JSON.parse(item);
      if (val.schema === SCHEMA_VERSION) {
        return val.data;
      }
      return {};
    }
  } catch (error) {
    console.error(error);
  }
  return {};
}

function scheduler() {
  return (cb: () => void) => {
    let destroyed = false;

    const id = safeRequestIdleCallback(
      () => {
        safeRequestAnimationFrame(() => {
          if (!destroyed) {
            cb();
          }
        });
      },
      {
        timeout: MAX_DEFERRED_WAIT_TIME,
      },
    );
    return () => {
      destroyed = true;
      safeCancelIdleCallback(id);
    };
  };
}
