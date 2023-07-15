import { slice } from '@bangle.io/nsm-3';

const defaultInitState: {
  githubWsName: string | undefined;
} = {
  githubWsName: undefined,
};

export const nsmGhSlice = slice([], {
  name: 'slice::github-storage:main',
  state: defaultInitState,
});

export const updateGithubDetails = nsmGhSlice.action(
  function updateGithubDetails(data: { githubWsName?: string | undefined }) {
    return nsmGhSlice.tx((state) => {
      return nsmGhSlice.update(state, data);
    });
  },
);
