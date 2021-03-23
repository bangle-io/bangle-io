import React, { useContext } from 'react';
import userEvent from '@testing-library/user-event';
import { render, act } from '@testing-library/react';
import { UIManager, UIManagerContext } from 'bangle-io/app/UIManager';
import {
  useGetWorkspaceFiles,
  useWorkspacePath,
  useWorkspaces,
} from 'bangle-io/app/workspace/workspace-hooks';
import { FILE_PALETTE } from '../paletteTypes';
import { Palette } from '../../Palette/Palette';

let result, paletteType, paletteInitialQuery, dispatch;
jest.mock('bangle-io/app/workspace/workspace-hooks', () => {
  return {
    useWorkspacePath: jest.fn(),
    useWorkspaces: jest.fn(),
    useGetWorkspaceFiles: jest.fn(),
  };
});

beforeEach(async () => {
  useGetWorkspaceFiles.mockImplementation(jest.fn(() => [[], jest.fn()]));
  useWorkspaces.mockImplementation(jest.fn(() => ({ workspaces: [] })));
  useWorkspacePath.mockImplementation(jest.fn(() => ({})));

  paletteType = undefined;
  paletteInitialQuery = undefined;
  dispatch = null;
  function Comp() {
    ({ paletteType, paletteInitialQuery, dispatch } = useContext(
      UIManagerContext,
    ));

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
  await act(() => new Promise((res) => setTimeout(res, 50)));

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

test.skip('Keybinds work', async () => {
  userEvent.keyboard('{ControlLeft>}r{/ControlLeft}');
  expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div />
      </div>
  `);
});
