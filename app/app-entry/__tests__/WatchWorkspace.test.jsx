import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import { useBroadcastChannel } from 'utils/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { render, act } from '@testing-library/react';

import { WatchWorkspace } from '../WatchWorkspace';
import { OpenedWsPaths } from 'ws-path';

const ourWsName = 'test-ws1';
const ourFileWsPath = ourWsName + ':hi.md';

jest.mock('utils/index', () => {
  const actual = jest.requireActual('utils/index');
  return {
    ...actual,
    useBroadcastChannel: jest.fn(),
  };
});
jest.mock('workspace-context/index', () => {
  const actual = jest.requireActual('workspace-context/index');
  return {
    ...actual,
    useWorkspaceContext: jest.fn(),
  };
});

let Comp;
let useWorkspaceContextReturn;
let useBroadcastChannelReturn;
let updateOpenedWsPathsCallback;
beforeEach(() => {
  updateOpenedWsPathsCallback = undefined;
  useWorkspaceContextReturn = {
    wsName: ourWsName,
    fileWsPaths: [],
    primaryWsPath: undefined,
    secondaryWsPath: undefined,
    refreshWsPaths: jest.fn(),
    updateOpenedWsPaths: jest.fn((cb) => {
      updateOpenedWsPathsCallback = cb;
    }),
  };
  useBroadcastChannelReturn = [undefined, jest.fn()];

  useWorkspaceContext.mockImplementation(() => useWorkspaceContextReturn);
  useBroadcastChannel.mockImplementation(() => useBroadcastChannelReturn);

  Comp = function Comp() {
    return <WatchWorkspace />;
  };
});

test('works', async () => {
  const result = render(<Comp />);
  expect(result.container).toMatchInlineSnapshot(`<div />`);
});

test('does nothing if event is for some other workspace', async () => {
  const result = render(<Comp />);
  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: 'other-ws', size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);
});

test('refreshes for if the event is correct', async () => {
  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspaceContextReturn.updateOpenedWsPaths).toBeCalledTimes(0);
});

test('if a deleted file is open it closed it', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.primaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspaceContextReturn.updateOpenedWsPaths).toBeCalledTimes(1);
  const openedWsPaths = new OpenedWsPaths([
    ourFileWsPath,
    'ws:xyz/some-other-file',
  ]);
  const newOpenedWsPaths = updateOpenedWsPathsCallback(openedWsPaths);
  expect(newOpenedWsPaths.primaryWsPath).toBe(null);
  expect(newOpenedWsPaths.secondaryWsPath).toBe('ws:xyz/some-other-file');
});

test('if a deleted file is open in both primary and secondary', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.primaryWsPath = ourFileWsPath;
  useWorkspaceContextReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspaceContextReturn.updateOpenedWsPaths).toBeCalledTimes(1);
  const openedWsPaths = new OpenedWsPaths([ourFileWsPath, ourFileWsPath]);
  const newOpenedWsPaths = updateOpenedWsPathsCallback(openedWsPaths);
  expect(newOpenedWsPaths.primaryWsPath).toBe(null);
  expect(newOpenedWsPaths.secondaryWsPath).toBe(null);
});

test('if a deleted file is open in secondary', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };
  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspaceContextReturn.updateOpenedWsPaths).toBeCalledTimes(1);
  const openedWsPaths = new OpenedWsPaths([null, ourFileWsPath]);
  const newOpenedWsPaths = updateOpenedWsPathsCallback(openedWsPaths);
  expect(newOpenedWsPaths.secondaryWsPath).toBe(null);
});

test('does not refreshes for if file size and lame hash are the same', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: ourFileWsPath },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);
});
