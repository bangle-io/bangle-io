// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import type { CoreServices } from '@bangle.io/types';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { PageWelcome } from '../page-welcome';
import { processRecentPaths } from '../page-welcome';

describe('PageWelcome', () => {
  it('renders welcome message', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMount();
    testRender.mountComponent({ ui: <PageWelcome />, services });

    expect(screen.getByText('Welcome to Bangle.io')).toBeInTheDocument();
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('shows "No recent notes" if no data present', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMount();
    testRender.mountComponent({ ui: <PageWelcome />, services });

    expect(
      screen.getByText(
        'No recent notes. Create or open a workspace to get started.',
      ),
    ).toBeInTheDocument();
  });

  it('displays recent notes from navigation activity', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMount();
    const { rerender } = testRender.mountComponent({
      ui: <PageWelcome />,
      services,
    });

    // Create a test workspace
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'test-workspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
    });

    // Navigate to different notes to create activity
    act(() => {
      services.navigation.goWsPath('test-workspace:note1.md');
    });
    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().wsPath).toBe(
        'test-workspace:note1.md',
      );
    });

    act(() => {
      services.navigation.goWsPath('test-workspace:note2.md');
    });
    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().wsPath).toBe(
        'test-workspace:note2.md',
      );
    });

    rerender(<PageWelcome />);

    // Wait for the recent notes to be displayed
    await screen.findByText('note1.md');

    // Verify both notes are shown
    expect(screen.getByText('note1.md')).toBeInTheDocument();
    expect(screen.getByText('note2.md')).toBeInTheDocument();

    // Verify workspace name is shown
    expect(screen.getAllByText('test-workspace')).toHaveLength(2);
  });

  it('displays notes from multiple workspaces', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMount();
    const { rerender } = testRender.mountComponent({
      ui: <PageWelcome />,
      services,
    });

    // Create two test workspaces
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'workspace1',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      await services.workspaceOps.createWorkspaceInfo({
        name: 'workspace2',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
    });

    // Navigate to notes in both workspaces
    act(() => {
      services.navigation.goWsPath('workspace1:notes/doc1.md');
    });
    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().wsPath).toBe(
        'workspace1:notes/doc1.md',
      );
    });

    act(() => {
      services.navigation.goWsPath('workspace2:important.md');
    });
    await vi.waitFor(() => {
      expect(services.navigation.resolveAtoms().wsPath).toBe(
        'workspace2:important.md',
      );
    });

    rerender(<PageWelcome />);

    // Wait for the recent notes to be displayed
    await screen.findByText('doc1.md');

    // Verify notes from both workspaces are shown
    expect(screen.getByText('doc1.md')).toBeInTheDocument();
    expect(screen.getByText('important.md')).toBeInTheDocument();

    // Verify both workspace names are shown
    expect(screen.getByText('workspace1')).toBeInTheDocument();
    expect(screen.getByText('workspace2')).toBeInTheDocument();
  });
});

// describe('processRecentPaths', () => {
//   const testRender = renderWithServices();
//   const logger = testRender.testEnv.logger;
//   let mockWorkspaceOps: Partial<CoreServices['workspaceOps']>;

//   beforeEach(() => {
//     mockWorkspaceOps = {
//       getAllWorkspaces: async () => [
//         {
//           name: 'workspace1',
//           type: WORKSPACE_STORAGE_TYPE.Memory,
//           metadata: {},
//           lastModified: Date.now(),
//         },
//         {
//           name: 'workspace2',
//           type: WORKSPACE_STORAGE_TYPE.Memory,
//           metadata: {},
//           lastModified: Date.now(),
//         },
//       ],
//       $workspaceInfoAnyChange: { subscribe: () => ({ unsubscribe: () => {} }) },
//       $workspaceInfoListChange: {
//         subscribe: () => ({ unsubscribe: () => {} }),
//       },
//       workspaceInfoCache: new Map(),
//       dep: {},
//     } as any;
//   });

//   it('handles empty recent paths by returning workspace homes', async () => {
//     const result = await processRecentPaths(
//       [],
//       mockWorkspaceOps as CoreServices['workspaceOps'],
//       logger,
//     );

//     expect(result).toHaveLength(2);
//     expect(result[0]).toEqual({
//       wsPath: 'workspace1',
//       wsName: 'workspace1',
//       href: expect.stringContaining('workspace1'),
//       displayName: 'Workspace Home',
//       isFirstInWorkspace: true,
//     });
//   });

//   it('processes mixed workspace and file paths correctly', async () => {
//     const recentPaths = [
//       { wsPath: 'workspace1:note1.md', timestamp: 100 },
//       { wsPath: 'workspace1:note2.md', timestamp: 90 },
//       { wsPath: 'workspace2:other.md', timestamp: 80 },
//     ];

//     const result = await processRecentPaths(
//       recentPaths,
//       mockWorkspaceOps as CoreServices['workspaceOps'],
//       logger,
//     );

//     expect(result).toHaveLength(3);
//     expect(result[0]).toEqual({
//       wsPath: 'workspace1:note1.md',
//       wsName: 'workspace1',
//       href: expect.stringContaining('note1.md'),
//       displayName: 'note1.md',
//       isFirstInWorkspace: true,
//     });
//     expect(result[2]?.isFirstInWorkspace).toBe(true);
//   });
// });
