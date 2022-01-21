/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import {
  listWorkspaces,
  WorkspaceInfo,
  WorkspaceType,
} from '@bangle.io/slice-workspaces-manager';
import { sleep } from '@bangle.io/utils';

import { workspacePalette } from '../WorkspacePalette';

jest.mock('@bangle.io/slice-workspaces-manager', () => {
  const workspaceThings = jest.requireActual(
    '@bangle.io/slice-workspaces-manager',
  );
  return {
    ...workspaceThings,
    deleteWorkspace: jest.fn(() => () => {}),
    listWorkspaces: jest.fn(() => () => {}),
  };
});

let workspaces: WorkspaceInfo[] = [
  {
    name: 'test-ws1',
    type: WorkspaceType['nativefs'],
    lastModified: 0,
    metadata: {},
  },
];

let listWorkspacesMock = listWorkspaces as jest.MockedFunction<
  typeof listWorkspaces
>;

let dismissPalette, onSelect, getActivePaletteItem;

beforeEach(async () => {
  onSelect = jest.fn();
  getActivePaletteItem = jest.fn();

  listWorkspacesMock.mockImplementation(() => async () => workspaces);
  dismissPalette = jest.fn();
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

  const prom = sleep(5);

  await act(() => prom);

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML.includes('test-ws1')).toBe(true);
});
