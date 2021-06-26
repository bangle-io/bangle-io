import React from 'react';
import { render } from '@testing-library/react';
import { useWorkspaces } from 'workspaces';
import { workspacePalette } from '../WorkspacePalette';

jest.mock('workspaces', () => {
  const workspaceThings = jest.requireActual('workspaces');
  return {
    ...workspaceThings,
    useWorkspaces: jest.fn(),
  };
});

let workspaces = [
  {
    name: 'test-ws1',
    type: 'nativefs',
  },
];

let switchWorkspace,
  deleteWorkspace,
  dismissPalette,
  onSelect,
  getActivePaletteItem;
beforeEach(async () => {
  onSelect = jest.fn();
  getActivePaletteItem = jest.fn();

  deleteWorkspace = jest.fn();
  switchWorkspace = jest.fn();
  dismissPalette = jest.fn();
  useWorkspaces.mockImplementation(() => ({
    workspaces,
    switchWorkspace,
    deleteWorkspace,
  }));
});

test('Component renders correctly', async () => {
  const result = render(
    <workspacePalette.ReactComponent
      query=""
      dismissPalette={dismissPalette}
      onClick={onSelect}
      getActivePaletteItem={getActivePaletteItem}
    />,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML.includes('test-ws1')).toBe(true);
});
