import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import { useBroadcastChannel } from 'utils/index';
import { useWorkspacePath } from 'workspace/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { render, act } from '@testing-library/react';

import { WatchWorkspace } from '../WatchWorkspace';

const ourWsName = 'test-ws1';
const ourFileWsPath = ourWsName + ':hi.md';

jest.mock('utils/index', () => {
  const actual = jest.requireActual('utils/index');
  return {
    ...actual,
    useBroadcastChannel: jest.fn(),
  };
});
jest.mock('workspace/index', () => {
  const actual = jest.requireActual('workspace/index');
  return {
    ...actual,
    useWorkspacePath: jest.fn(),
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
let useWorkspacePathReturn;
beforeEach(() => {
  useWorkspaceContextReturn = {
    fileWsPaths: [],
    refreshWsPaths: jest.fn(),
  };
  useBroadcastChannelReturn = [undefined, jest.fn()];
  useWorkspacePathReturn = {
    wsName: ourWsName,
    wsPath: undefined,
    secondaryWsPath: undefined,
    removeWsPath: jest.fn(),
    removeSecondaryWsPath: jest.fn(),
    removePrimaryAndSecondaryWsPath: jest.fn(),
  };

  useWorkspaceContext.mockImplementation(() => useWorkspaceContextReturn);
  useWorkspacePath.mockImplementation(() => useWorkspacePathReturn);
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
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open it closed it', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.wsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open in both primary and secondary', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.wsPath = ourFileWsPath;
  useWorkspacePathReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
  expect(
    useWorkspacePathReturn.removePrimaryAndSecondaryWsPath,
  ).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open in secondary', async () => {
  useWorkspaceContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };
  useWorkspaceContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
  expect(
    useWorkspacePathReturn.removePrimaryAndSecondaryWsPath,
  ).toBeCalledTimes(0);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(1);
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
