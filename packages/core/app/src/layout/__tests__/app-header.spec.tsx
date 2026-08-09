// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { fireEvent, screen, within } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from '../app-header';

describe('AppHeader note actions', () => {
  it('shows the shared actions for the rendered current note', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'workspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      await services.fileSystem.createTextFile(
        'workspace:folder/note.md',
        '# Note',
      );
      services.navigation.goWsPath('workspace:folder/note.md');
    });
    await vi.waitFor(() => {
      expect(services.workspaceState.resolveAtoms().currentWsPath?.wsPath).toBe(
        'workspace:folder/note.md',
      );
    });

    testRender.mountComponent({ ui: <AppHeader /> });
    const trigger = await screen.findByRole('button', { name: 'Note actions' });
    expect(trigger).toHaveClass('h-7', 'w-7');

    fireEvent.click(trigger);
    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Rename',
      'Move',
      'Duplicate',
      'Copy Path',
      'Recover',
      'Delete',
    ]);
    expect(within(menu).getAllByRole('separator')).toHaveLength(1);

    const dispatch = vi.spyOn(services.commandDispatcher, 'dispatch');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }));
    expect(dispatch).toHaveBeenCalledWith(
      'command::ws:clone-note',
      { wsPath: 'workspace:folder/note.md' },
      'AppHeader.NoteActions',
    );
  });

  it('hides note actions without a current note', async () => {
    const testRender = renderWithServices();
    await testRender.autoMountServices();
    testRender.mountComponent({ ui: <AppHeader /> });

    expect(
      screen.queryByRole('button', { name: 'Note actions' }),
    ).not.toBeInTheDocument();
  });
});
