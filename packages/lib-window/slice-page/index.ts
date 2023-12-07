import { createKey } from '@nalanda/core';

import { PAGE_ROUTE } from '@bangle.io/constants';
import { locationHelpers, OpenedWsPaths } from '@bangle.io/ws-path';

import { sliceHistory } from './slice-history';
import { sliceLifeCycle } from './slice-lifecycle';
export { getHistoryRef } from './slice-history';

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

const openedWsPathsField = key.derive(
  (state) => {
    const primaryWsPath = primaryWsPathField.get(state);

    return !primaryWsPath
      ? OpenedWsPaths.createEmpty()
      : OpenedWsPaths.createEmpty().updatePrimaryWsPath(primaryWsPath);
  },
  {
    equal: (a, b) => {
      return a.equal(b);
    },
  },
);

const pageRouteField = key.derive((state) => {
  const location = sliceHistory.getField(state, 'location');

  return locationHelpers.getPageRoute(location?.pathname);
});

export const slicePage = key.slice({
  pageLifeCycle: pageLifeCycleField,
  historyLoaded: historyLoadedField,
  primaryWsPath: primaryWsPathField,
  openedWsPaths: openedWsPathsField,
  wsName: wsNameField,
  pageRoute: pageRouteField,

  blockPageReload: sliceLifeCycle.actions.blockPageReload,
  unblockPageReload: sliceLifeCycle.actions.unblockPageReload,
  location: locationField,
  goTo: sliceHistory.actions.goTo,
});

export const slicePageAllSlices = [sliceLifeCycle, sliceHistory, slicePage];
