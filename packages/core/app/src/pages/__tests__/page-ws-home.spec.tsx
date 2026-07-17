// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { WsPath } from '@bangle.io/ws-path';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageWsHome } from '../page-ws-home';

async function setupWorkspaceWithNotes(noteNames: string[]) {
  const testRender = renderWithServices();
  const services = await testRender.autoMountServices();

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
  });

  act(() => {
    services.navigation.goWorkspace('myWorkspace');
  });

  await vi.waitFor(() => {
    expect(services.workspaceState.resolveAtoms().wsPaths).toHaveLength(
      noteNames.length,
    );
    expect(services.workspaceState.resolveAtoms().currentWsName).toBeDefined();
  });

  return { testRender, services };
}

function getRenderedNoteNames(): string[] {
  const table = screen.getByTestId('ws-home-notes-table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryByRole('link')?.textContent ?? '');
}

describe('PageWsHome', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('lists every note ordered by modification recency', async () => {
    // Give each Date.now call a strictly increasing value so notes created
    // later always carry a larger mtime.
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000;
      return now;
    });

    const { testRender } = await setupWorkspaceWithNotes([
      'alpha.md',
      'zeta.md',
      'beta.md',
    ]);

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames()).toEqual(['beta', 'zeta', 'alpha']);
    });
  });

  it('sorts by name when the name header is toggled', async () => {
    const { testRender } = await setupWorkspaceWithNotes([
      'zeta.md',
      'alpha.md',
      'beta.md',
    ]);

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames()).toHaveLength(3);
    });

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));
    await waitFor(() => {
      expect(getRenderedNoteNames()).toEqual(['alpha', 'beta', 'zeta']);
    });

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));
    await waitFor(() => {
      expect(getRenderedNoteNames()).toEqual(['zeta', 'beta', 'alpha']);
    });
  });

  it('filters notes by name and folder, and reports empty matches', async () => {
    const { testRender } = await setupWorkspaceWithNotes([
      'groceries.md',
      'work/meeting.md',
      'work/roadmap.md',
    ]);

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames()).toHaveLength(3);
    });

    const filterInput = screen.getByRole('textbox', {
      name: /filter notes/i,
    });

    fireEvent.change(filterInput, { target: { value: 'meet' } });
    await waitFor(() => {
      expect(getRenderedNoteNames()).toEqual(['meeting']);
    });

    // Folder names match too, so a folder query reveals its notes.
    fireEvent.change(filterInput, { target: { value: 'work' } });
    await waitFor(() => {
      expect(getRenderedNoteNames().sort()).toEqual(['meeting', 'roadmap']);
    });

    fireEvent.change(filterInput, { target: { value: 'nothing-matches' } });
    await waitFor(() => {
      expect(
        screen.getByText(/no notes match your filter/i),
      ).toBeInTheDocument();
    });
  });

  it('shows folder location and star indicator', async () => {
    const { testRender, services } = await setupWorkspaceWithNotes([
      'root-note.md',
      'work/starred-note.md',
    ]);

    await act(async () => {
      await services.userActivityService.toggleStarItem(
        WsPath.fromString('myWorkspace:work/starred-note.md'),
        true,
      );
    });

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames()).toHaveLength(2);
    });

    const table = screen.getByTestId('ws-home-notes-table');
    const starredRow = within(table)
      .getAllByRole('row')
      .find((row) => within(row).queryByText('starred-note'));
    expect(starredRow).toBeDefined();
    expect(
      within(starredRow as HTMLElement).getByText('Starred'),
    ).toBeInTheDocument();
    expect(within(starredRow as HTMLElement).getByText('work')).toBeVisible();
  });

  it('respects persisted column visibility from workbench state', async () => {
    const { testRender, services } = await setupWorkspaceWithNotes([
      'note1.md',
    ]);

    act(() => {
      testRender.testEnv.commonOpts.store.set(
        services.workbenchState.$notesTableColumnVisibility,
        { location: false, createdAt: true },
      );
    });

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames()).toHaveLength(1);
    });

    expect(
      screen.queryByRole('button', { name: /sort by location/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sort by created/i }),
    ).toBeInTheDocument();
  });

  it('keeps a note row rendered when its file stat read fails', async () => {
    const { testRender, services } = await setupWorkspaceWithNotes([
      'healthy.md',
      'broken.md',
    ]);

    const originalFileStat = services.fileSystem.fileStat.bind(
      services.fileSystem,
    );
    vi.spyOn(services.fileSystem, 'fileStat').mockImplementation(
      async (wsPath, options) => {
        if (wsPath === 'myWorkspace:broken.md') {
          throw new Error('stat failed');
        }
        return originalFileStat(wsPath, options);
      },
    );

    testRender.mountComponent({ ui: <PageWsHome /> });

    await waitFor(() => {
      expect(getRenderedNoteNames().sort()).toEqual(['broken', 'healthy']);
    });

    const table = screen.getByTestId('ws-home-notes-table');
    const brokenRow = within(table)
      .getAllByRole('row')
      .find((row) => within(row).queryByText('broken'));
    // Visible columns are name, location, modified, actions: the modified
    // cell of the failed row stays an em-dash placeholder.
    const brokenCells = within(brokenRow as HTMLElement).getAllByRole('cell');
    expect(brokenCells[2]).toHaveTextContent('—');

    const healthyRow = within(table)
      .getAllByRole('row')
      .find((row) => within(row).queryByText('healthy'));
    const healthyCells = within(healthyRow as HTMLElement).getAllByRole('cell');
    expect(healthyCells[2]).not.toHaveTextContent('—');
  });
});
