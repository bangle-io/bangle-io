// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { screen, waitFor, within } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PageWsHome } from '../page-ws-home';

describe('PageWsHome', () => {
  it('shows empty state if no notes', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'myWorkspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
    });

    testRender.mountComponent({ ui: <PageWsHome /> });

    act(() => {
      services.navigation.goWorkspace('myWorkspace');
    });

    await vi.waitFor(() => {
      expect(
        services.workspaceState.resolveAtoms().currentWsName,
      ).toBeDefined();
    });

    expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
  });

  it('orders notes by real activity while keeping starred notes visible', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    const noteNames = [
      'note1.md',
      'note2.md',
      'note3.md',
      'note4.md',
      'note5.md',
      'note6.md',
      'note7.md',
    ];

    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'myWorkspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });

      for (const noteName of noteNames) {
        await services.fileSystem.createTextFile(
          `myWorkspace:${noteName}`,
          `# ${noteName}`,
        );
      }

      await services.workspaceOps.updateWorkspaceMetadata(
        'myWorkspace',
        (metadata) => ({
          ...metadata,
          'starred-items': ['myWorkspace:note7.md', 'myWorkspace:note4.md'],
          // Deliberately unsorted: UserActivityService is responsible for
          // providing the view with timestamp-ordered activity.
          'ws-activity': [
            activity('note4.md', 400),
            activity('note1.md', 700),
            activity('note7.md', 100),
            activity('note3.md', 500),
            activity('note2.md', 600),
            activity('note6.md', 200),
            activity('note5.md', 300),
          ],
        }),
      );
    });

    act(() => {
      services.navigation.goWorkspace('myWorkspace');
    });

    await vi.waitFor(() => {
      expect(services.workspaceState.resolveAtoms().wsPaths).toHaveLength(7);
      expect(
        services.workspaceState.resolveAtoms().currentWsName,
      ).toBeDefined();
    });

    testRender.mountComponent({ ui: <PageWsHome /> });

    const heading = await screen.findByRole('heading', {
      name: /recent notes/i,
    });
    const notesSection = heading.parentElement;
    if (!notesSection) {
      throw new Error('Expected the recent notes heading to have a container');
    }

    await waitFor(() => {
      const links = within(notesSection).getAllByRole('link');
      expect(links.map((link) => link.firstElementChild?.textContent)).toEqual([
        'note4.md',
        'note7.md',
        'note1.md',
        'note2.md',
        'note3.md',
        'note5.md',
      ]);
    });
    expect(
      screen.getByRole('button', { name: /view all/i }),
    ).toBeInTheDocument();
  });
});

function activity(noteName: string, timestamp: number) {
  return {
    entityType: 'ws-path',
    data: { wsPath: `myWorkspace:${noteName}` },
    timestamp,
  };
}
