import {
  createTestStore,
  setupMockMessageChannel,
} from '@bangle.io/test-utils';
import { isWorkerGlobalScope, sleep } from '@bangle.io/utils';

import { editorSyncSlice } from '../slice-editor-sync';

const isWorkerGlobalScopeMock = jest.mocked(isWorkerGlobalScope);

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');

  return {
    ...actual,
    isWorkerGlobalScope: jest.fn(() => false),
  };
});

let cleanup = () => {};
beforeEach(() => {
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  cleanup();
});

describe('transferPortEffect', () => {
  test('blank state', async () => {
    const testStore = createTestStore({
      slices: [editorSyncSlice()],
    });

    await sleep(0);

    expect(testStore.actionsDispatched).toEqual([
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-editor-sync:transfer-port',
        value: {
          port: expect.anything(),
          messageChannel: expect.any(MessageChannel),
        },
      },
    ]);

    expect(testStore.actionsDispatched?.[0]!.value?.port).toEqual({
      close: expect.any(Function),
      onmessage: expect.any(Function),
      postMessage: expect.any(Function),
      _name: 'port1',
    });
  });

  test('does nothing in worker', () => {
    isWorkerGlobalScopeMock.mockImplementation(() => true);
    const testStore = createTestStore({
      slices: [editorSyncSlice()],
    });

    expect(testStore.actionsDispatched).toEqual([]);
  });
});
