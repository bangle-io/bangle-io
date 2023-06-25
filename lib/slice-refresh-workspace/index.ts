import { createSliceV2, serialAction, z } from '@bangle.io/nsm';

export const sliceRefreshWorkspace = createSliceV2([], {
  name: 'bangle/slice-refresh-workspace',
  initState: {
    refreshWorkspace: 0,
  },
});

export const refreshWorkspace = sliceRefreshWorkspace.createAction(
  'incrementCounter',
  serialAction(z.null(), () => {
    return (state) => ({
      ...state,
      refreshWorkspace: state.refreshWorkspace + 1,
    });
  }),
);
