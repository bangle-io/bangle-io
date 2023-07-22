import { slice } from '@bangle.io/nsm-3';

export const sliceRefreshWorkspace = slice([], {
  name: 'bangle/slice-refresh-workspace',
  state: {
    refreshWorkspace: 0,
  },
});

export const refreshWorkspace = sliceRefreshWorkspace.action(
  function refreshWorkspace() {
    return sliceRefreshWorkspace.tx((state) => {
      return sliceRefreshWorkspace.update(state, (state) => ({
        refreshWorkspace: state.refreshWorkspace + 1,
      }));
    });
  },
);
