// This file provides mocked return value
// so that the consumer doesnt have to mock
// every value which they dont care about,
// while still getting type checks
// {
//  ...getEditorPluginMetadataReturn,
//  // override things
//  wsPath: 'xyz:sys.md'
// }
import type { Writable } from 'type-fest';

import { initialNsmStore } from '@bangle.io/bangle-store-context';
import { EditorDisplayType } from '@bangle.io/constants';
import { initialState } from '@bangle.io/slice-ui';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import { createWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

export const getEditorPluginMetadataReturn: ReturnType<
  typeof getEditorPluginMetadata
> = {
  dispatchSerialOperation: typeof jest === 'undefined' ? () => {} : jest.fn(),
  editorDisplayType: EditorDisplayType.Page,
  wsPath: createWsPath('test-workspace:my-test-note.md'),
  nsmStore: initialNsmStore,
  createdAt: 0,
  collabMessageBus: {} as any,
};

export const getUseUIManagerContextReturn: Writable<any> = {
  ...initialState,
  dispatch: typeof jest === 'undefined' ? () => {} : jest.fn(() => {}),
  bangleStore: {} as any,
};

export const getUseWorkspaceContextReturn: Writable<ReturnType<any>> = {
  bangleStore: {} as any,
  cachedWorkspaceInfo: undefined,
  noteWsPaths: [],
  openedWsPaths: OpenedWsPaths.createEmpty(),
  recentlyUsedWsPaths: [],
  refreshCounter: 0,
  wsName: 'test-ws',
  wsPaths: [],
};
