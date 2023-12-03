import { createKey } from '@nalanda/core';

import { locationHelpers } from '@bangle.io/ws-path';

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

const primaryWsPathField = key.derive((state) => {
  const location = sliceHistory.getField(state, 'location');
  return location ? locationHelpers.getPrimaryWsPath(location) : undefined;
});

// WARNING: If changing also make changes to slice-workspace-naukar
const wsNameField = key.derive((state) => {
  const location = sliceHistory.getField(state, 'location');

  return location ? locationHelpers.getWsName(location) : undefined;
});

export const slicePage = key.slice({
  pageLifeCycle: pageLifeCycleField,
  historyLoaded: historyLoadedField,
  primaryWsPath: primaryWsPathField,
  wsName: wsNameField,

  blockPageReload: sliceLifeCycle.actions.blockPageReload,
  unblockPageReload: sliceLifeCycle.actions.unblockPageReload,
  location: locationField,
  goTo: sliceHistory.actions.goTo,
});

export const slicePageAllSlices = [sliceLifeCycle, sliceHistory, slicePage];
export { getHistoryRef } from './slice-history';
