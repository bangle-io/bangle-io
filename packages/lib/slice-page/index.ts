import { createKey } from '@nalanda/core';

import { sliceHistory } from './slice-history';
import { sliceLifeCycle } from './slice-lifecycle';

const key = createKey('slice-page', [sliceLifeCycle, sliceHistory]);

const pageLifeCycleField = key.derive((state) => {
  return sliceLifeCycle.getField(state, 'pageLifeCycle');
});

const locationField = key.derive((state) => {
  return sliceHistory.getField(state, 'location');
});

const historyLoadedField = key.derive((state) => {
  return sliceHistory.getField(state, 'historyLoaded');
});

export const slicePage = key.slice({
  pageLifeCycle: pageLifeCycleField,
  historyLoaded: historyLoadedField,
  blockPageReload: sliceLifeCycle.actions.blockPageReload,
  unblockPageReload: sliceLifeCycle.actions.unblockPageReload,
  location: locationField,
  goTo: sliceHistory.actions.goTo,
});

export const slicePageAllSlices = [sliceLifeCycle, sliceHistory, slicePage];
export { getHistoryRef } from './slice-history';
