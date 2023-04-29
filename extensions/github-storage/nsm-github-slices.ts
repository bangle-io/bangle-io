import { createSliceV2, updateObj } from '@bangle.io/nsm';

const defaultInitState: {
  githubWsName: string | undefined;
} = {
  githubWsName: undefined,
};

export const nsmGhSlice = createSliceV2([], {
  name: 'slice::github-storage:main',

  initState: defaultInitState,
});

export const updateGithubDetails = nsmGhSlice.createAction(
  'updateGithubDetails',
  (data: { githubWsName?: string | undefined }) => {
    return (state) => updateObj(state, data);
  },
);
