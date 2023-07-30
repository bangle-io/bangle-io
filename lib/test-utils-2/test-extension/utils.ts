import waitForExpect from 'wait-for-expect';

import { internalApi, nsmApi2 } from '@bangle.io/api';
import { WorkspaceType } from '@bangle.io/constants';
import type { WsPath } from '@bangle.io/shared-types';
import { checkConditionUntilTrue, sleep } from '@bangle.io/utils';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

export async function createNotes(
  noteWsPaths: Array<[string | WsPath, string]> = [
    ['test-ws-1:one.md', '# Hello World 0'],
    ['test-ws-1:two.md', '# Hello World 1'],
  ],
  opts: {
    loadFirst?: boolean;
  } = {},
) {
  if (noteWsPaths.length === 0) {
    return;
  }

  for (const [wsPath, content] of noteWsPaths) {
    await nsmApi2.workspace.writeNoteFromMd(createWsPath(wsPath), content);
  }

  const { loadFirst } = opts;

  const firstPath = noteWsPaths?.[0]?.[0];

  if (loadFirst && typeof firstPath === 'string') {
    nsmApi2.workspace.pushPrimaryWsPath(createWsPath(firstPath));

    checkConditionUntilTrue(
      () => nsmApi2.workspace.workspaceState().primaryWsPath === firstPath,
      {
        name: 'createNotes: wait for primary ws to be set',
        interval: 30,
        maxTries: 10,
      },
    );
  }
}

export async function createWorkspace(wsName = 'test-ws-1') {
  return internalApi.workspace.createWorkspace(
    createWsName(wsName),
    WorkspaceType.Browser,
    {},
  );
}
