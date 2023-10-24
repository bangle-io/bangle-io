import waitForExpect from 'wait-for-expect';

import type { BangleEditor } from '@bangle.dev/core';

import { internalApi, nsmApi2 } from '@bangle.io/api';
import { PRIMARY_EDITOR_INDEX, WorkspaceType } from '@bangle.io/constants';
import type { WsPath } from '@bangle.io/shared-types';
import { checkConditionUntilTrue } from '@bangle.io/utils';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

export const getEditor = nsmApi2.editor.getEditor;

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
    await nsmApi2.workspace.createNoteFromMd(createWsPath(wsPath), content);
  }

  const { loadFirst } = opts;

  const firstPath = noteWsPaths?.[0]?.[0];

  if (loadFirst && typeof firstPath === 'string') {
    nsmApi2.workspace.pushPrimaryWsPath(createWsPath(firstPath));

    checkConditionUntilTrue(
      () => nsmApi2.workspace.workspaceState().primaryWsPath === firstPath,
      {
        name: 'createNotes: wait for primary ws to be set',
        interval: 20,
        maxTries: 30,
      },
    );
  }
}

export async function createWorkspace(
  wsName = 'test-ws-1',
  type = WorkspaceType.Browser,
  opts: Record<string, unknown> = {},
) {
  return internalApi.workspace.createWorkspace(
    createWsName(wsName),
    type,
    opts,
  );
}

export async function typeText(
  text: string,
  editorId = PRIMARY_EDITOR_INDEX,
  pos?: number,
) {
  const editor = nsmApi2.editor.getEditor(editorId)!;

  // wait for collab to initialize
  await isEditorCollabReady(editor);
  const editorState = editor.view.state;

  const tr = editorState.tr.insertText(
    text,
    pos == null ? editorState.selection.head : pos,
  );

  editor.view.dispatch(tr);
}

export async function isEditorCollabReady(editor: BangleEditor) {
  // const editor = editorManagerSliceKey.callQueryOp(
  //   store.state,
  //   getEditor(editorIndex),
  // );
  await waitForExpect(() =>
    expect(editor?.view.dom.classList.contains('bangle-collab-active')).toBe(
      true,
    ),
  );
}

/**
 * A quick helper to query the state of a slice without explicitly
 * depending on it. This is useful for testing.
 * @param sliceName
 * @returns
 */
export function querySliceState(
  sliceName: string,
): Record<string, any> | undefined {
  const store = internalApi._internal_getStore();

  if (!store) {
    throw new Error('Store not setup');
  }

  const slice = store.opts.slices.find((s) => {
    return s.name === sliceName;
  });

  if (!slice) {
    throw new Error(`Slice ${sliceName} not found`);
  }

  return slice.get(store.state);
}
