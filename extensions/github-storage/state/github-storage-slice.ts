import { slice } from '@bangle.io/nsm-3';
import type { WsPath } from '@bangle.io/shared-types';

const defaultInitState: {
  githubWsName: string | undefined;
  conflictedWsPaths: WsPath[];
} = {
  githubWsName: undefined,
  conflictedWsPaths: [],
};

export const nsmGhSlice = slice([], {
  name: 'slice::github-storage:main',
  state: defaultInitState,
});

export const updateGithubDetails = nsmGhSlice.action(
  function updateGithubDetails(data: {
    githubWsName?: string | undefined;
    conflictedWsPaths?: WsPath[];
  }) {
    return nsmGhSlice.tx((state) => {
      return nsmGhSlice.update(state, data);
    });
  },
);

export const resetGithubState = nsmGhSlice.action(function resetGithubState() {
  return nsmGhSlice.tx((state) => {
    return nsmGhSlice.update(state, defaultInitState);
  });
});
