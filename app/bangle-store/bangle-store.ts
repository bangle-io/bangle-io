import { MAIN_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { initExtensionRegistry } from '@bangle.io/shared';
import type { BangleStateConfig, JsonValue } from '@bangle.io/shared-types';
import { editorManagerSlice } from '@bangle.io/slice-editor-manager';
import { uiSlice } from '@bangle.io/slice-ui';
import {
  assertNonWorkerGlobalScope,
  safeCancelIdleCallback,
  safeRequestAnimationFrame,
  safeRequestIdleCallback,
} from '@bangle.io/utils';
import { checkModuleWorkerSupport } from '@bangle.io/worker-setup';

import {
  BangleActionTypes,
  BangleSliceTypes,
  bangleStateSlices,
} from './bangle-slices';

assertNonWorkerGlobalScope();

const LOG = true || window.location?.hash?.includes('debug_store');

let log = LOG ? console.debug.bind(console, 'bangle-store') : () => {};

const persistKey = 'bangle-store-0.124';

const SCHEMA_VERSION = 'bangle-store/1';

const MAX_DEFERRED_WAIT_TIME = 400;

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const extensionRegistry = initExtensionRegistry();
  const extensionSlices = extensionRegistry.getSlices();

  const stateOpts: BangleStateConfig = {
    extensionRegistry,
    useWebWorker: checkModuleWorkerSupport(),
    saveState: (store) => {
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
    },
  };

  const makeStore = () => {
    const stateJson = {
      ...retrieveLocalStorage(),
      ...retrieveSessionStorage(),
    };

    let state = AppState.stateFromJSON({
      slices: bangleStateSlices({
        onUpdate,
        extensionSlices,
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
        log(
          action.fromStore ? `from=[${action.fromStore}]` : '',
          action.name,
          action.id,

          // There is a bug most likely in sentry or comlink  where console logging a
          // proxy gives a cryptic error "Cannot read properties of undefined (reading 'Symbol(Symbol.toPrimitive)')".
          action.name === 'action::@bangle.io/worker-naukar-proxy:naukar' ||
            action.name === 'action::@bangle.io/slice-editor-manager:set-editor'
            ? '[Proxy value redacted]'
            : action.value,
        );

        (window as any).Sentry?.addBreadcrumb?.({
          type: 'action',
          message: [
            action.name,
            action.fromStore ? `[${action.fromStore}]` : '[]',
            action.id,
            action.value ? `[${Object.keys(action.value).join(',')}]` : '[]',
          ].join(' | '),
          timestamp: Date.now(),
          level: 'info',
        });

        const newState = store.state.applyAction(action);
        store.updateState(newState);
      },
      scheduler: scheduler(),
    });
  };

  return makeStore();
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
