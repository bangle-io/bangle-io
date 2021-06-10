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

beforeEach(() => {
  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [],
    refreshWsPaths: jest.fn(),
  }));

  useWorkspacePath.mockImplementation(() => ({
    wsName: ourWsName,
    wsPath: undefined,
    secondaryWsPath: undefined,
    removeWsPath: jest.fn(),
    removeSecondaryWsPath: jest.fn(),
  }));

  useBroadcastChannel.mockImplementation(() => [undefined, jest.fn()]);
});

test('works', async () => {
  function Comp() {
    return <WatchWorkspace />;
  }

  const result = render(<Comp />);
  expect(result.container).toMatchInlineSnapshot(`<div />`);
});

test('does nothing if event is for some other workspace', async () => {
  const refreshWsPaths = jest.fn();
  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [],
    refreshWsPaths,
  }));

  function Comp() {
    return <WatchWorkspace />;
  }

  const result = render(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);

  const broadCastMessage = jest.fn();

  useBroadcastChannel.mockImplementation(() => [
    {
      type: 'FILE_TREE_CHANGED',
      payload: { wsName: 'other-ws', size: 1, lameHash: 'hash' },
    },
    broadCastMessage,
  ]);

  result.rerender(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);
});

test('refreshes for if the event is correct', async () => {
  const refreshWsPaths = jest.fn();
  const removeWsPath = jest.fn();

  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [],
    refreshWsPaths,
  }));

  useWorkspacePath.mockImplementation(() => ({
    wsName: ourWsName,
    wsPath: undefined,
    secondaryWsPath: undefined,
    removeWsPath,
    removeSecondaryWsPath: undefined,
  }));

  function Comp() {
    return <WatchWorkspace />;
  }

  const result = render(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);

  const broadCastMessage = jest.fn();

  useBroadcastChannel.mockImplementation(() => [
    {
      type: 'FILE_TREE_CHANGED',
      payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
    },
    broadCastMessage,
  ]);

  result.rerender(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(1);
  expect(removeWsPath).toBeCalledTimes(0);
});

test('for a refresh checks if file is not currently opened', async () => {
  const refreshWsPaths = jest.fn();
  const removeWsPath = jest.fn();
  const removeSecondaryWsPath = jest.fn();
  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [ourFileWsPath],
    refreshWsPaths,
  }));

  useWorkspacePath.mockImplementation(() => ({
    wsName: ourWsName,
    wsPath: ourFileWsPath,
    secondaryWsPath: undefined,
    removeWsPath,
    removeSecondaryWsPath,
  }));

  function Comp() {
    return <WatchWorkspace />;
  }

  const result = render(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);

  const broadCastMessage = jest.fn();

  useBroadcastChannel.mockImplementation(() => [
    {
      type: 'FILE_TREE_CHANGED',
      payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
    },
    broadCastMessage,
  ]);

  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [],
    refreshWsPaths,
  }));

  result.rerender(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(1);
  expect(removeWsPath).toBeCalledTimes(1);
  expect(removeSecondaryWsPath).toBeCalledTimes(0);
});

test('does not refreshes for if file size and lame hash are the same', async () => {
  const refreshWsPaths = jest.fn();
  useWorkspaceHooksContext.mockImplementation(() => ({
    fileWsPaths: [ourFileWsPath],
    refreshWsPaths,
  }));

  function Comp() {
    return <WatchWorkspace />;
  }

  const result = render(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);

  const broadCastMessage = jest.fn();

  useBroadcastChannel.mockImplementation(() => [
    {
      type: 'FILE_TREE_CHANGED',
      payload: { wsName: ourWsName, size: 1, lameHash: ourFileWsPath },
    },
    broadCastMessage,
  ]);

  result.rerender(<Comp />);

  expect(refreshWsPaths).toBeCalledTimes(0);
});
