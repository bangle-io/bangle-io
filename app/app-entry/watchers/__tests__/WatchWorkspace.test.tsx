/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { render } from '@testing-library/react';
import React from 'react';

import {
  refreshWsPaths,
  updateOpenedWsPaths,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils';
import { useBroadcastChannel } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { WatchWorkspace } from '../WatchWorkspace';

const ourWsName = getUseWorkspaceContextReturn['wsName'];
const ourFileWsPath = ourWsName + ':hi.md';

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');

  return {
    ...actual,
    useBroadcastChannel: jest.fn(),
  };
});
jest.mock('@bangle.io/slice-workspace', () => {
  const actual = jest.requireActual('@bangle.io/slice-workspace');

  return {
    ...actual,
    refreshWsPaths: jest.fn(),
    updateOpenedWsPaths: jest.fn(),
    useWorkspaceContext: jest.fn(),
  };
});

let Comp: React.FC;
let useWorkspaceContextReturn: Partial<typeof getUseWorkspaceContextReturn>;
let useBroadcastChannelReturn: any;
let updateOpenedWsPathsCallback: any;

const updateOpenedWsPathsMock = updateOpenedWsPaths as jest.MockedFunction<
  typeof updateOpenedWsPaths
>;
const refreshWsPathsMock = refreshWsPaths as jest.MockedFunction<
  typeof refreshWsPaths
>;
const useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

beforeEach(() => {
  updateOpenedWsPathsCallback = undefined;

  useWorkspaceContextReturn = {};
  useBroadcastChannelReturn = [undefined, jest.fn()];

  (useBroadcastChannel as any).mockImplementation(
    () => useBroadcastChannelReturn,
  );

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      ...useWorkspaceContextReturn,
    };
  });

  updateOpenedWsPathsMock.mockImplementation((cb) => () => {
    updateOpenedWsPathsCallback = cb;

    return true;
  });
  refreshWsPathsMock.mockImplementation(() => () => true);

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
  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: 'other-ws', size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);
});

test('refreshes for if the event is correct', async () => {
  const result = render(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(1);
  expect(updateOpenedWsPathsMock).toBeCalledTimes(0);
});

test('if a deleted file is open, it closes it and rest remains unaffected', async () => {
  useWorkspaceContextReturn.wsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.openedWsPaths = OpenedWsPaths.createFromArray([
    ourFileWsPath,
  ]);

  const result = render(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.wsPaths = ['ws:xyz/some-other-file'];

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(1);
  expect(updateOpenedWsPathsMock).toBeCalledTimes(1);
  const openedWsPaths = OpenedWsPaths.createFromArray([
    ourFileWsPath,
    'ws:xyz/some-other-file',
  ]);
  const newOpenedWsPaths: OpenedWsPaths =
    updateOpenedWsPathsCallback(openedWsPaths);

  // the secondary wsPath comes to first as we shrink things
  expect(newOpenedWsPaths.toArray()[0]).toEqual('ws:xyz/some-other-file');
  expect(newOpenedWsPaths.toArray()[1]).toEqual(null);
});

test('if a deleted file is open in both primary and secondary', async () => {
  useWorkspaceContextReturn.wsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.openedWsPaths = OpenedWsPaths.createFromArray([
    ourFileWsPath,
    ourFileWsPath,
  ]);

  const result = render(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };

  useWorkspaceContextReturn.wsPaths = [];

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(1);
  expect(refreshWsPathsMock).toBeCalledTimes(1);
  expect(updateOpenedWsPathsMock).toBeCalledTimes(1);
  const openedWsPaths = OpenedWsPaths.createFromArray([
    ourFileWsPath,
    ourFileWsPath,
  ]);
  const newOpenedWsPaths = updateOpenedWsPathsCallback(openedWsPaths);
  expect(newOpenedWsPaths.primaryWsPath).toBe(undefined);
  expect(newOpenedWsPaths.secondaryWsPath).toBe(undefined);
});

test('if a deleted file is open in secondary', async () => {
  useWorkspaceContextReturn.wsPaths = [ourFileWsPath];
  useWorkspaceContextReturn.openedWsPaths = OpenedWsPaths.createFromArray([
    undefined,
    ourFileWsPath,
  ]);

  const result = render(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: 'hash' },
  };
  useWorkspaceContextReturn.wsPaths = [];

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(1);
  expect(updateOpenedWsPathsMock).toBeCalledTimes(1);
  const openedWsPaths = OpenedWsPaths.createFromArray([null, ourFileWsPath]);
  const newOpenedWsPaths = updateOpenedWsPathsCallback(openedWsPaths);
  expect(newOpenedWsPaths.secondaryWsPath).toBe(undefined);
});

test('does not refreshes for if file size and lame hash are the same', async () => {
  useWorkspaceContextReturn.wsPaths = [ourFileWsPath];

  const result = render(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);

  useBroadcastChannelReturn[0] = {
    type: 'FILE_TREE_CHANGED',
    payload: { wsName: ourWsName, size: 1, lameHash: ourFileWsPath },
  };

  result.rerender(<Comp />);

  expect(refreshWsPathsMock).toBeCalledTimes(0);
});
