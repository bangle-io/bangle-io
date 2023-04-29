import { createSlice, createSliceV2, updateObj } from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { OpenedWsPaths } from '@bangle.io/ws-path';

const initState: {
  wsName: string | undefined;
  openedWsPaths: OpenedWsPaths;
  wsPaths: string[] | undefined;
} = {
  wsName: undefined,
  openedWsPaths: OpenedWsPaths.createEmpty(),
  wsPaths: undefined,
};

export const nsmSliceWorkspace = createSliceV2([nsmPageSlice], {
  name: 'nsm-slice-workspace',
  initState,
});

// While the other old store is the driver, this method just adds a copy of things to the new store
export const stopGap_setWsData = nsmSliceWorkspace.createAction(
  'stopGap_setWsData',
  ({
    wsName,
    openedWsPaths,
  }: {
    wsName: string | undefined;
    openedWsPaths: OpenedWsPaths;
  }) => {
    return (state) => updateObj(state, { wsName, openedWsPaths });
  },
);
