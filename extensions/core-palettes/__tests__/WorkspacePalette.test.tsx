import { render } from '@testing-library/react';
import React from 'react';

import { useWorkspaces } from '@bangle.io/workspaces';

import { workspacePalette } from '../WorkspacePalette';

jest.mock('@bangle.io/workspaces', () => {
  const workspaceThings = jest.requireActual('@bangle.io/workspaces');
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
  (useWorkspaces as jest.Mock).mockImplementation(() => ({
    workspaces,
    switchWorkspace,
    deleteWorkspace,
  }));
});

test('Component renders correctly', async () => {
  const result = render(
    <workspacePalette.ReactComponent
      query=""
      paletteType={undefined}
      paletteMetadata={{}}
      updatePalette={() => {}}
      counter={0}
      updateCounter={() => {}}
      dismissPalette={dismissPalette}
      onSelect={onSelect}
      getActivePaletteItem={getActivePaletteItem}
      allPalettes={[]}
    />,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML.includes('test-ws1')).toBe(true);
});
