import { internalApi, nsmApi2 } from '@bangle.io/api';
import { WorkspaceType } from '@bangle.io/constants';
import type { WsPath } from '@bangle.io/shared-types';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

export async function createNotes(
  noteWsPaths: Array<[string | WsPath, string]> = [
    ['test-ws-1:one.md', '# Hello World 0'],
    ['test-ws-1:two.md', '# Hello World 1'],
  ],
) {
  for (const [wsPath, content] of noteWsPaths) {
    await nsmApi2.workspace.writeNoteFromMd(createWsPath(wsPath), content);
  }
}

export async function createWorkspace(wsName = 'test-ws-1') {
  return internalApi.workspace.createWorkspace(
    createWsName(wsName),
    WorkspaceType.Browser,
    {},
  );
}
