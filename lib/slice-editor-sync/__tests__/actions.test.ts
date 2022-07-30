// This shape (Record<actionName, action[]>) exists so the we can exhaustively

import { APPLY_TRANSFER } from '@bangle.io/store-sync';
import {
  createTestStore,
  setupMockMessageChannel,
} from '@bangle.io/test-utils';

import type { EditorSyncActions } from '../common';
import { editorSyncSlice } from '../slice-editor-sync';

let cleanup = () => {};
beforeEach(() => {
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  cleanup();
});

test('serialization', () => {
  const testStore = createTestStore({
    slices: [editorSyncSlice()],
  });
  const messageChannel = new MessageChannel();
  const action: EditorSyncActions = {
    name: 'action::@bangle.io/slice-editor-sync:transfer-port',
    value: {
      port: messageChannel.port1,
      messageChannel: messageChannel,
    },
  };

  const serializedAction = testStore.store.serializeAction(action);
  expect(serializedAction).toEqual({
    name: 'action::@bangle.io/slice-editor-sync:transfer-port',
    serializedValue: {
      port: expect.anything(),
      [APPLY_TRANSFER]: 'port',
    },
    storeName: 'test-store',
  });

  const parsedAction = testStore.store.parseAction(serializedAction as any);

  // must forward port2 to the other side
  expect(parsedAction.value.port).toEqual({
    close: expect.any(Function),
    onmessage: undefined,
    postMessage: expect.any(Function),
    _name: 'port2',
  });

  expect(parsedAction).toEqual({
    name: 'action::@bangle.io/slice-editor-sync:transfer-port',
    value: {
      port: expect.anything(),
    },
    fromStore: 'test-store',
  });
});
