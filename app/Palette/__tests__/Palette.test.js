import React, { useContext } from 'react';
import userEvent from '@testing-library/user-event';
import { render, act } from '@testing-library/react';
import { UIManager, UIManagerContext } from 'ui-context/index';

import {
  useGetWorkspaceFiles,
  useWorkspacePath,
  useWorkspaces,
} from 'workspace/index';
import { FILE_PALETTE, INPUT_PALETTE } from '../paletteTypes';
import { Palette } from '../../Palette/Palette';
import { sleep } from 'utils/index';

let result, paletteType, paletteInitialQuery, dispatch;

jest.mock('workspace/index', () => {
  const actual = jest.requireActual('workspace/index');
  return {
    ...actual,
    useWorkspacePath: jest.fn(),
    useWorkspaces: jest.fn(),
    useGetWorkspaceFiles: jest.fn(),
    useCreateMdFile: jest.fn(),
    useRenameActiveFile: jest.fn(),
    useDeleteFile: jest.fn(),
  };
});

beforeEach(async () => {
  useGetWorkspaceFiles.mockImplementation(jest.fn(() => [[], jest.fn()]));
  useWorkspaces.mockImplementation(jest.fn(() => ({ workspaces: [] })));
  useWorkspacePath.mockImplementation(jest.fn(() => ({})));

  dispatch = null;
  paletteType = undefined;
  paletteInitialQuery = undefined;

  function Comp() {
    ({ paletteType, dispatch } = useContext(UIManagerContext));

    return (
      <div>
        <Palette />
      </div>
    );
  }

  result = await render(
    <UIManager>
      <Comp />
    </UIManager>,
  );
});

test('Empty on mount', async () => {
  expect(result.container).toMatchInlineSnapshot(`
    <div>
      <div />
    </div>
  `);

  expect(paletteType).toBeUndefined();
});

test('Correctly switches to file type', async () => {
  let promise = Promise.resolve();

  useGetWorkspaceFiles.mockImplementation(() => {
    return [['my-ws:one.md'], jest.fn()];
  });
  act(() => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: { type: FILE_PALETTE },
    });
  });

  await act(() => promise);
  await act(() => new Promise((res) => setTimeout(res, 0)));

  expect([...result.container.querySelectorAll('.side-bar-row')])
    .toMatchInlineSnapshot(`
    Array [
      <div
        class="flex side-bar-row flex-row items-center cursor-pointer  active "
        style="padding-left: 16px; padding-right: 16px;"
      >
        <span
          class="text-lg truncate select-none"
        >
          one.md
        </span>
        <span
          class="flex-1 flex "
        />
      </div>,
    ]
  `);

  expect(result.container).toMatchSnapshot();
});

test('Correctly filters commands', async () => {
  act(() => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: { type: FILE_PALETTE },
    });
  });

  const input = result.getByLabelText('palette-input');
  userEvent.type(input, '>');

  expect(result.container.querySelectorAll('.side-bar-row')).toMatchSnapshot();

  userEvent.type(input, 'toggle');

  expect(result.container.querySelectorAll('.side-bar-row'))
    .toMatchInlineSnapshot(`
    NodeList [
      <div
        class="flex side-bar-row flex-row items-center cursor-pointer  active "
        style="padding-left: 16px; padding-right: 16px;"
      >
        <span
          class="text-lg truncate select-none"
        >
          View: Toggle theme
        </span>
        <span
          class="flex-1 flex "
        />
      </div>,
      <div
        class="flex side-bar-row flex-row items-center cursor-pointer   "
        style="padding-left: 16px; padding-right: 16px;"
      >
        <span
          class="text-lg truncate select-none"
        >
          View: Toggle sidebar
        </span>
        <span
          class="flex-1 flex "
        />
      </div>,
    ]
  `);
});

test('input palette', async () => {
  const initialQuery = 'hello';
  const onInputConfirm = jest.fn();
  act(() => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: {
        type: INPUT_PALETTE,
        initialQuery,
        metadata: {
          onInputConfirm,
        },
      },
    });
  });

  const input = result.getByLabelText('palette-input');
  expect(paletteType).toBe(INPUT_PALETTE);

  expect(input.value).toBe(initialQuery);

  await act(async () => {
    userEvent.type(input, '{enter}');
    // to let uiManager settle
    await sleep(0);
  });
  expect(onInputConfirm).toBeCalledTimes(1);
  expect(onInputConfirm).nthCalledWith(1, 'hello');

  expect(paletteType).toBe(null);
});
