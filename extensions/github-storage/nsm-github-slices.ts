import { createSliceV2, updateState } from '@bangle.io/nsm';

const defaultInitState: {
  githubWsName: string | undefined;
} = {
  githubWsName: undefined,
};

export const nsmGhSlice = createSliceV2([], {
  name: 'slice::github-storage:main',

  initState: defaultInitState,
});

const updateObj = updateState(defaultInitState);

export const updateGithubDetails = nsmGhSlice.createAction(
  'updateGithubDetails',
  (data: { githubWsName?: string | undefined }) => {
    return (state) => updateObj(state, data);
  },
);
