// This file provides mocked return value
// so that the consumer doesnt have to mock
// every value which they dont care about,
// while still getting type checks
// {
//  ...getEditorPluginMetadataReturn,
//  // override things
//  wsPath: 'xyz:sys.md'
// }
import type { Mutable } from 'type-fest';

import { initialBangleStore } from '@bangle.io/app-state-context';
import { EditorDisplayType } from '@bangle.io/constants';
import {
  initialEditorSliceState,
  useEditorManagerContext,
} from '@bangle.io/editor-manager-context';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import type { useWorkspaceContext } from '@bangle.io/workspace-context';
import { OpenedWsPaths } from '@bangle.io/ws-path';

export const getEditorPluginMetadataReturn: ReturnType<
  typeof getEditorPluginMetadata
> = {
  dispatchAction: jest.fn(),
  editorDisplayType: EditorDisplayType.Page,
  wsPath: 'test-workspace:my-test-note.md',
};

export const getUseWorkspaceContextReturn: Mutable<
  ReturnType<typeof useWorkspaceContext>
> = {
  wsName: 'test-ws',
  recentlyUsedWsPaths: [],
  wsPaths: [],
  noteWsPaths: [],
  openedWsPaths: OpenedWsPaths.createEmpty(),
  bangleStore: initialBangleStore,
};

export const getUseEditorManagerContextReturn: ReturnType<
  typeof useEditorManagerContext
> = {
  ...initialEditorSliceState,
  bangleStore: initialBangleStore,
};
