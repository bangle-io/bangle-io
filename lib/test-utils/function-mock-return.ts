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

import { initialBangleStore } from '@bangle.io/bangle-store-context';
import { EditorDisplayType } from '@bangle.io/constants';
import type { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import { initialEditorSliceState } from '@bangle.io/slice-editor-manager';
import type { useUIManagerContext } from '@bangle.io/slice-ui';
import { initialState } from '@bangle.io/slice-ui';
import type { useWorkspaceContext } from '@bangle.io/slice-workspace';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

export const getEditorPluginMetadataReturn: ReturnType<
  typeof getEditorPluginMetadata
> = {
  dispatchSerialOperation: jest.fn(),
  editorDisplayType: EditorDisplayType.Page,
  bangleStore: initialBangleStore,
  wsPath: 'test-workspace:my-test-note.md',
};

export const getUseUIManagerContextReturn: Mutable<
  ReturnType<typeof useUIManagerContext>
> = {
  ...initialState,
  dispatch: jest.fn(() => {}),
  bangleStore: initialBangleStore,
};

export const getUseWorkspaceContextReturn: Mutable<
  ReturnType<typeof useWorkspaceContext>
> = {
  bangleStore: initialBangleStore,
  cachedWorkspaceInfo: undefined,
  noteWsPaths: [],
  openedWsPaths: OpenedWsPaths.createEmpty(),
  recentlyUsedWsPaths: [],
  refreshCounter: 0,
  wsName: 'test-ws',
  wsPaths: [],
  storageProviderErrors: [],
};

export const getUseEditorManagerContextReturn: ReturnType<
  typeof useEditorManagerContext
> = {
  ...initialEditorSliceState,
  bangleStore: initialBangleStore,
};
