/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { workspace } from '@bangle.io/api';
import { WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';

import { workspacePalette } from '../WorkspacePalette';

jest.mock('@bangle.io/api', () => {
  const { workspace, ...otherThing } = jest.requireActual('@bangle.io/api');

  return {
    ...otherThing,
    useSerialOperationContext: jest.fn(() => ({})),
    workspace: {
      ...workspace,
      readAllWorkspacesInfo: jest.fn(async () => undefined),
    },
  };
});

jest.mock('@bangle.io/slice-workspace', () => {
  const workspaceThings = jest.requireActual('@bangle.io/slice-workspace');

  return {
    ...workspaceThings,
    deleteWorkspace: jest.fn(() => () => {}),
  };
});

let workspaces: WorkspaceInfo[] = [
  {
    name: 'test-ws1',
    type: WorkspaceType.NativeFS,
    lastModified: 0,
    metadata: {
      rootDirHandle: {},
    },
  },
];

jest
  .mocked(workspace.readAllWorkspacesInfo)
  .mockImplementation(async () => workspaces);

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
