import { createKey } from '@nalanda/core';

import { defaultWorkerWindowStoreReplica } from '@bangle.io/constants';
import { WorkerWindowStoreReplica } from '@bangle.io/shared-types';

const key = createKey('naukar/slice-window-state', []);

const windowStateReplicaField = key.field(defaultWorkerWindowStoreReplica);

function updateWindowReplica(
  nextState: (current: WorkerWindowStoreReplica) => WorkerWindowStoreReplica,
) {
  return windowStateReplicaField.update((current) => {
    return nextState(current);
  });
}

const pageLocationField = key.derive((state) => {
  return windowStateReplicaField.get(state).page?.location;
});

const pageLifecycleField = key.derive((state) => {
  return windowStateReplicaField.get(state).page?.lifecycle;
});

const uiWidescreenField = key.derive((state) => {
  return windowStateReplicaField.get(state).ui?.widescreen;
});

const uiScreenWidthField = key.derive((state) => {
  return windowStateReplicaField.get(state).ui?.screenWidth;
});

const uiScreenHeightField = key.derive((state) => {
  return windowStateReplicaField.get(state).ui?.screenHeight;
});

export const sliceWindowState = key.slice({
  pageLifecycle: pageLifecycleField,
  pageLocation: pageLocationField,

  uiScreenHeight: uiScreenHeightField,
  uiScreenWidth: uiScreenWidthField,
  uiWidescreen: uiWidescreenField,
  updateWindowReplica: updateWindowReplica,
  windowStateReplica: windowStateReplicaField,
});
