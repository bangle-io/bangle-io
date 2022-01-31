/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { WorkspaceTypeNative } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { listWorkspaces } from '@bangle.io/slice-workspace';
import { sleep } from '@bangle.io/utils';

import { workspacePalette } from '../WorkspacePalette';

jest.mock('@bangle.io/slice-workspace', () => {
  const workspaceThings = jest.requireActual('@bangle.io/slice-workspace');
  return {
    ...workspaceThings,
    deleteWorkspace: jest.fn(() => () => {}),
    listWorkspaces: jest.fn(() => () => {}),
  };
});

let workspaces: WorkspaceInfo[] = [
  {
    name: 'test-ws1',
    type: WorkspaceTypeNative,
    lastModified: 0,
    metadata: {
      rootDirHandle: {},
    },
  },
];

jest.mocked(listWorkspaces).mockImplementation(() => async () => workspaces);

let dismissPalette = jest.fn(),
  onSelect = jest.fn(),
  getActivePaletteItem = jest.fn();

test('Component renders correctly', async () => {
  const { container } = render(
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

  expect(container).toMatchSnapshot();
  expect(container.innerHTML.includes('test-ws1')).toBe(true);
});
