// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { assertIsDefined } from '@bangle.io/base-utils';
import { describe, expect, test, vi } from 'vitest';
import { setupTest } from './test-utils';

describe('WS command handlers', () => {
  describe('command::ws:clone-note', () => {
    test.each([
      {
        description: 'clones a normal note with no prior copies',
        initialNotes: ['test-ws:test.md'],
        expectedClone: 'test-ws:test-copy-1.md',
      },
      {
        description: 'generates copy note with continuous copies',
        initialNotes: [
          'test-ws:test.md',
          'test-ws:test-copy-1.md',
          'test-ws:test-copy-2.md',
        ],
        expectedClone: 'test-ws:test-copy-3.md',
      },
      {
        description: 'skips missing copy number when copies are non-continuous',
        initialNotes: [
          'test-ws:test.md',
          'test-ws:test-copy-1.md',
          'test-ws:test-copy-3.md',
        ],
        expectedClone: 'test-ws:test-copy-2.md',
      },
      {
        description: 'handles cloning note with existing copy suffix',
        initialNotes: ['test-ws:test-copy-1.md'],
        expectedClone: 'test-ws:test-copy-2.md',
      },
      {
        description: 'handles cloning note in a subdirectory',
        initialNotes: ['test-ws:dir/test.md'],
        expectedClone: 'test-ws:dir/test-copy-1.md',
      },
    ])('should %s', async ({ initialNotes, expectedClone }) => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:clone-note',
        workspaces: [{ name: 'test-ws', notes: initialNotes }],
        autoNavigate: 'ws-path',
      });

      const initialCount =
        services.workspaceState.resolveAtoms().wsPaths.length;

      dispatch('command::ws:clone-note', null);

      await vi.waitFor(async () => {
        const wsPaths = services.workspaceState.resolveAtoms().wsPaths;
        expect(wsPaths.length).toBe(initialCount + 1);
        expect(wsPaths.map(({ wsPath }) => wsPath)).toContain(expectedClone);

        // Verify navigation updated to the new clone
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          expectedClone,
        );

        // Verify that the content was copied from the original note
        const activeNote = initialNotes[initialNotes.length - 1];
        assertIsDefined(activeNote);
        const originalFile = await services.fileSystem.readFile(activeNote);
        const cloneFile = await services.fileSystem.readFile(expectedClone);
        if (originalFile && cloneFile) {
          const originalContent = await originalFile.text();
          const cloneContent = await cloneFile.text();
          expect(cloneContent).toBe(originalContent);
        }
      });
    });
  });

  describe('command::ws:daily-note', () => {
    const FIXED_DATE_TIMESTAMP = new Date(2024, 1, 15).getTime();
    const EXPECTED_DATE_STR = '2024-Feb-15';
    const EXPECTED_ROOT_FILENAME = `${EXPECTED_DATE_STR}-daily.md`;
    const EXPECTED_ROOT_WSPATH = `test-ws:${EXPECTED_ROOT_FILENAME}`;
    const EXPECTED_SUBDIR_FILENAME = `${EXPECTED_DATE_STR}-daily.md`;
    const EXPECTED_SUBDIR_WSPATH = `test-ws:subdir/${EXPECTED_SUBDIR_FILENAME}`;

    test('should create daily note in root if no note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [{ name: 'test-ws' }],
        autoNavigate: 'workspace', // Navigate to workspace home
      });

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_ROOT_WSPATH,
        );

        const content =
          await services.fileSystem.readFileAsText(EXPECTED_ROOT_WSPATH);
        expect(content).toBeDefined();
      });
    });

    test('should create daily note in root if a root note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [{ name: 'test-ws', notes: ['test-ws:root-note.md'] }],
        autoNavigate: 'ws-path',
      });

      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:root-note.md',
      );

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_ROOT_WSPATH,
        );
        const content =
          await services.fileSystem.readFileAsText(EXPECTED_ROOT_WSPATH);
        expect(content).toBeDefined();
      });
    });

    test('should create daily note in subdir if a subdir note is open', async () => {
      const { dispatch, services } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [
          { name: 'test-ws', notes: ['test-ws:subdir/sub-note.md'] },
        ],
        autoNavigate: 'ws-path',
      });

      expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
        'test-ws:subdir/sub-note.md',
      );

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_SUBDIR_WSPATH,
        );

        const content = await services.fileSystem.readFileAsText(
          EXPECTED_SUBDIR_WSPATH,
        );
        expect(content).toBeDefined();
      });
    });

    test('should navigate to existing daily note in subdir', async () => {
      const { dispatch, services, getCommandResults } = await setupTest({
        targetId: 'command::ws:daily-note',
        workspaces: [
          {
            name: 'test-ws',
            notes: ['test-ws:subdir/other.md', EXPECTED_SUBDIR_WSPATH],
          },
        ],
        autoNavigate: 'ws-path', // Navigate to subdir/other.md
      });

      const createSpy = vi.spyOn(services.fileSystem, 'createFile');

      dispatch('command::ws:daily-note', { date: FIXED_DATE_TIMESTAMP });

      await vi.waitFor(async () => {
        // Check navigation
        expect(services.navigation.resolveAtoms().wsPath?.wsPath).toBe(
          EXPECTED_SUBDIR_WSPATH,
        );

        // Ensure create file was not called
        expect(createSpy).not.toHaveBeenCalled();

        // Ensure create-note command was not dispatched
        expect(
          getCommandResults()
            .filter((r) => r.type === 'success')
            .map((r) => r.command.id),
        ).not.toContain('command::ws:create-note');
      });
    });
  });

  describe('command::workspace:toggle-star', () => {
    test('should toggle star status for the currently open note', async () => {
      const NOTE_WS_PATH = 'test-ws:current-note.md';
      const { dispatch, services } = await setupTest({
        targetId: 'command::workspace:toggle-star',
        workspaces: [{ name: 'test-ws', notes: [NOTE_WS_PATH] }],
        autoNavigate: 'ws-path',
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        expect(starredPaths).toEqual([]);
      });

      dispatch('command::workspace:toggle-star', {
        wsPath: undefined,
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        expect(starredPaths).toContain(NOTE_WS_PATH);
      });

      // Action 2: Unstar the note by dispatching the command again
      dispatch('command::workspace:toggle-star', {
        wsPath: undefined,
      });

      await vi.waitFor(() => {
        const starredPaths =
          services.userActivityService.resolveAtoms().starredWsPaths;
        // Since it was the only starred note, the list should be empty again.
        expect(starredPaths).toEqual([]);
      });
    });
  });
});
