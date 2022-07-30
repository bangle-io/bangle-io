import { CollabMessageBus, MessageType } from '@bangle.dev/collab-comms';

import { AppState } from '@bangle.io/create-store';
import { setupMockMessageChannel } from '@bangle.io/test-utils';

import { editorSyncKey } from '../common';
import { editorSyncSlice } from '../slice-editor-sync';

let cleanup = () => {};
beforeEach(() => {
  cleanup = setupMockMessageChannel();
});

afterEach(() => {
  cleanup();
});

test('blank state', () => {
  let state = AppState.create({ slices: [editorSyncSlice()] });

  expect(editorSyncKey.getSliceState(state)).toStrictEqual({
    collabMessageBus: expect.any(CollabMessageBus),
    port: undefined,
    unregister: expect.any(Function),
  });
});

describe('transfer-port', () => {
  let state = AppState.create({ slices: [editorSyncSlice()] });
  let messageChannel = new MessageChannel();

  beforeEach(() => {
    state = AppState.create({ slices: [editorSyncSlice()] });

    const { collabMessageBus } = editorSyncKey.getSliceStateAsserted(state);

    jest.spyOn(collabMessageBus, 'receiveMessages');
    jest.spyOn(collabMessageBus, 'transmit');

    messageChannel = new MessageChannel();

    expect(messageChannel.port1.onmessage).toBeUndefined();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-editor-sync:transfer-port',
      value: {
        port: messageChannel.port1,
        messageChannel: messageChannel,
      },
    });
  });

  test('dispatching transfer-port', () => {
    const { collabMessageBus } = editorSyncKey.getSliceStateAsserted(state);

    expect(editorSyncKey.getSliceState(state)).toStrictEqual({
      collabMessageBus: expect.any(CollabMessageBus),
      port: messageChannel.port1,
      unregister: expect.any(Function),
    });

    // sets up correctly
    expect(collabMessageBus.receiveMessages).toHaveBeenCalledTimes(1);
    expect(messageChannel.port1.onmessage).toBeDefined();
  });

  test('messages from port are correctly forwarded to collabMessageBus', () => {
    const { collabMessageBus } = editorSyncKey.getSliceStateAsserted(state);

    const message = {
      type: 'test',
      payload: {
        test: 'test',
      },
    };

    messageChannel.port2.postMessage(message);

    expect(collabMessageBus.transmit).toHaveBeenCalledTimes(1);
    expect(collabMessageBus.transmit).nthCalledWith(1, message);
  });

  test('messages from collabMessageBus are correctly to port', () => {
    const { collabMessageBus } = editorSyncKey.getSliceStateAsserted(state);

    collabMessageBus.transmit({
      to: 'some-one',
      from: 'from-someone',
      id: 'sdsd',
      messageBody: {},
      type: MessageType.PING,
    });

    expect(messageChannel.port1.postMessage).toHaveBeenCalledTimes(1);
    expect(messageChannel.port1.postMessage).nthCalledWith(1, {
      to: 'some-one',
      from: 'from-someone',
      id: 'sdsd',
      messageBody: {},
      type: MessageType.PING,
    });
  });

  test('unregistering works', () => {
    const { unregister, port } = editorSyncKey.getSliceStateAsserted(state);

    let mockFn = jest.fn();
    editorSyncKey.getSliceStateAsserted(state).unregister = mockFn;

    let newMessageChannel = new MessageChannel();

    state = state.applyAction({
      name: 'action::@bangle.io/slice-editor-sync:transfer-port',
      value: {
        port: newMessageChannel.port1,
        messageChannel: newMessageChannel,
      },
    });

    expect(port?.close).toBeCalledTimes(1);
    expect(mockFn).toBeCalledTimes(1);
  });
});
