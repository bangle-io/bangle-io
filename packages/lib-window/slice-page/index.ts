import { createKey } from '@nalanda/core';

import { locationHelpers, OpenedWsPaths } from '@bangle.io/ws-path';

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

const openedWsPathField = key.derive(
  (state) => {
    const location = sliceHistory.getField(state, 'location');
    const primaryWsPath = primaryWsPathField.get(state);

    return location
      ? OpenedWsPaths.createEmpty()
      : OpenedWsPaths.createEmpty().updatePrimaryWsPath(primaryWsPath);
  },
  {
    equal: (a, b) => {
      return a.equal(b);
    },
  },
);

export const slicePage = key.slice({
  pageLifeCycle: pageLifeCycleField,
  historyLoaded: historyLoadedField,
  primaryWsPath: primaryWsPathField,
  openedWsPath: openedWsPathField,
  wsName: wsNameField,

  blockPageReload: sliceLifeCycle.actions.blockPageReload,
  unblockPageReload: sliceLifeCycle.actions.unblockPageReload,
  location: locationField,
  goTo: sliceHistory.actions.goTo,
});

export const slicePageAllSlices = [sliceLifeCycle, sliceHistory, slicePage];
export { getHistoryRef } from './slice-history';
