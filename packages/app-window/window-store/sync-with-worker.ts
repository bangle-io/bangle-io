import { cleanup, createKey, EffectStore, ref } from '@nalanda/core';
import * as Comlink from 'comlink';
import { enablePatches, Patch, produceWithPatches } from 'immer';

import { defaultWorkerWindowStoreReplica } from '@bangle.io/constants';
import { getWindowStoreConfig } from '@bangle.io/lib-window-common';
import { superJson } from '@bangle.io/nsm-3';
import {
  WindowActions,
  WorkerWindowStoreReplica,
} from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { queueToast, sliceUI } from '@bangle.io/slice-ui';

enablePatches();

const key = createKey('window/sync-with-worker', [sliceUI, slicePage]);
const mirroredStateField = key.field(defaultWorkerWindowStoreReplica);

export const sliceSyncWithWindowStore = key.slice({});

const getPatchesRef = ref<Patch[]>(() => {
  return [];
});
const gtIdCounterRef = ref<number>(() => 0);

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);
  let destroyed = false;

  const actions: WindowActions = {
    queueToast: async (options) => {
      if (destroyed) {
        return;
      }
      queueToast(store, options.toastRequest);
    },

    queueDialog: async (options) => {
      if (destroyed) {
        return;
      }
      store.dispatch(
        sliceUI.actions.showDialog(
          options.dialogRequest.name,
          options.dialogRequest.payload,
        ),
      );
    },

    pageBlockPageReload: async ({ block }) => {
      if (destroyed) {
        return;
      }
      if (block) {
        store.dispatch(slicePage.actions.blockPageReload());
      } else {
        store.dispatch(slicePage.actions.unblockPageReload());
      }
    },
  };

  void eternalVars.naukar.sendWindowActions(Comlink.proxy(actions));

  cleanup(store, () => {
    destroyed = true;
  });
});

function updatePatches(
  store: EffectStore,
  [nextState, patches]: readonly [WorkerWindowStoreReplica, Patch[], Patch[]],
) {
  const patchesRef = getPatchesRef(store);
  patchesRef.current.push(...patches);
  store.dispatch(mirroredStateField.update(nextState));
}

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);
  const patchesRef = getPatchesRef(store);
  // for re-running this effect
  const mirrorState = mirroredStateField.track(store);

  const idCounterRef = gtIdCounterRef(store);
  if (patchesRef.current.length === 0) {
    return;
  }

  const patches = patchesRef.current;
  patchesRef.current = [];

  void eternalVars.naukar.sendPatches({
    id: idCounterRef.current++,
    patches: superJson.stringify(patches),
  });
});

// Following effects are responsible for creating patches
key.effect((store) => {
  const { colorScheme, widescreen, screenHeight, screenWidth } =
    sliceUI.track(store);
  const mirrorState = mirroredStateField.get(store.state);
  updatePatches(
    store,
    produceWithPatches(mirrorState, (draft) => {
      draft.ui.colorScheme = colorScheme;
      draft.ui.screenHeight = screenHeight;
      draft.ui.screenWidth = screenWidth;
      draft.ui.widescreen = widescreen;
    }),
  );
});

key.effect((store) => {
  const { location, pageLifeCycle } = slicePage.track(store);
  const mirrorState = mirroredStateField.get(store.state);

  updatePatches(
    store,
    produceWithPatches(mirrorState, (draft) => {
      draft.page.lifecycle = pageLifeCycle;
      draft.page.location = location;
    }),
  );
});