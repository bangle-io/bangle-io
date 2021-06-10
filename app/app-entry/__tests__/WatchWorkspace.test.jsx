import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import { useBroadcastChannel } from 'utils/index';
import { useWorkspacePath } from 'workspace/index';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';
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
jest.mock('workspace-hooks/index', () => {
  const actual = jest.requireActual('workspace-hooks/index');
  return {
    ...actual,
    useWorkspaceHooksContext: jest.fn(),
  };
});

let Comp;
let useWorkspaceHooksContextReturn;
let useBroadcastChannelReturn;
let useWorkspacePathReturn;
beforeEach(() => {
  useWorkspaceHooksContextReturn = {
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

  useWorkspaceHooksContext.mockImplementation(
    () => useWorkspaceHooksContextReturn,
  );
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
  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: 'other-ws', size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);
});

test('refreshes for if the event is correct', async () => {
  const result = render(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open it closed it', async () => {
  useWorkspaceHooksContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.wsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceHooksContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open in both primary and secondary', async () => {
  useWorkspaceHooksContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.wsPath = ourFileWsPath;
  useWorkspacePathReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceHooksContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
  expect(
    useWorkspacePathReturn.removePrimaryAndSecondaryWsPath,
  ).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(0);
});

test('if a deleted file is open in secondary', async () => {
  useWorkspaceHooksContextReturn.fileWsPaths = [ourFileWsPath];
  useWorkspacePathReturn.secondaryWsPath = ourFileWsPath;

  const result = render(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };
  useWorkspaceHooksContextReturn.fileWsPaths = [];

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(1);
  expect(useWorkspacePathReturn.removeWsPath).toBeCalledTimes(0);
  expect(
    useWorkspacePathReturn.removePrimaryAndSecondaryWsPath,
  ).toBeCalledTimes(0);
  expect(useWorkspacePathReturn.removeSecondaryWsPath).toBeCalledTimes(1);
});

test('does not refreshes for if file size and lame hash are the same', async () => {
  useWorkspaceHooksContextReturn.fileWsPaths = [ourFileWsPath];

  const result = render(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: ourFileWsPath },
  };

  result.rerender(<Comp />);

  expect(useWorkspaceHooksContextReturn.refreshWsPaths).toBeCalledTimes(0);
});
