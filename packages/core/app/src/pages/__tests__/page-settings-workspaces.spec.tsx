// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { screen, waitFor, within } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspacesSettingsPage } from '../page-settings-workspaces';

const WORKSPACE_WITH_NOTE = 'ws-with-note';
const EMPTY_WORKSPACE = 'ws-empty';

async function setupWorkspaces(
  services: Awaited<
    ReturnType<ReturnType<typeof renderWithServices>['autoMountServices']>
  >,
) {
  await act(async () => {
    await services.workspaceOps.createWorkspaceInfo({
      name: WORKSPACE_WITH_NOTE,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.workspaceOps.createWorkspaceInfo({
      name: EMPTY_WORKSPACE,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    services.commandDispatcher.dispatch(
      'command::ws:create-note',
      {
        wsPath: `${WORKSPACE_WITH_NOTE}:note1.md`,
        navigate: undefined,
        content: undefined,
      },
      'test',
    );
  });
}

function noteCellFor(wsName: string): HTMLElement {
  const nameLink = screen.getByRole('link', { name: wsName });
  const infoCell = nameLink.parentElement;
  if (!infoCell) {
    throw new Error(`Could not find info cell for workspace ${wsName}`);
  }
  return infoCell;
}

describe('WorkspacesSettingsPage', () => {
  it('shows per-workspace note counts scoped to each row', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await setupWorkspaces(services);

    testRender.mountComponent({ ui: <WorkspacesSettingsPage /> });

    await waitFor(() => {
      expect(
        within(noteCellFor(WORKSPACE_WITH_NOTE)).getByText('1 note'),
      ).toBeInTheDocument();
    });
    expect(
      within(noteCellFor(EMPTY_WORKSPACE)).getByText('0 notes'),
    ).toBeInTheDocument();
  });

  it('shows "Notes unavailable" instead of "0 notes" when the count fails to load', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await setupWorkspaces(services);

    // A read/permission failure must never be presented as an empty ("0 notes")
    // workspace — it must surface as unavailable.
    vi.spyOn(services.fileSystem, 'listNoteFiles').mockRejectedValue(
      new Error('listing failed'),
    );

    testRender.mountComponent({ ui: <WorkspacesSettingsPage /> });

    await waitFor(() => {
      expect(
        within(noteCellFor(WORKSPACE_WITH_NOTE)).getByText('Notes unavailable'),
      ).toBeInTheDocument();
    });
    expect(
      within(noteCellFor(EMPTY_WORKSPACE)).getByText('Notes unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByText('0 notes')).not.toBeInTheDocument();
    expect(screen.queryByText('1 note')).not.toBeInTheDocument();
  });
});
