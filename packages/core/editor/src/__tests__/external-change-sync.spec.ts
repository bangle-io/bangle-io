// @vitest-environment jsdom

import {
  EXTERNAL_FILE_CHANGE_SENDER_TAG,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

const WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${WS_NAME}:note.md`;
const EXTERNAL_SENDER = {
  id: 'other-source',
  tag: EXTERNAL_FILE_CHANGE_SENDER_TAG,
};

let cleanupControllers: AbortController[] = [];
let cleanupDomNodes: HTMLElement[] = [];

afterEach(() => {
  for (const controller of cleanupControllers) {
    controller.abort();
  }
  cleanupControllers = [];
  for (const domNode of cleanupDomNodes) {
    domNode.remove();
  }
  cleanupDomNodes = [];
});

async function setupEditorWithNote(initialContent: string) {
  const controller = new AbortController();
  cleanupControllers.push(controller);
  const testEnv = createTestEnvironment({ controller });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();

  await services.workspaceOps.createWorkspaceInfo({
    name: WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });
  await services.fileSystem.createTextFile(NOTE_WS_PATH, initialContent);

  const domNode = document.createElement('div');
  document.body.append(domNode);
  cleanupDomNodes.push(domNode);

  services.editorEngine.mountEditor({
    domNode,
    wsPath: NOTE_WS_PATH,
    name: 'main-test-editor',
    focus: false,
  });
  await vi.waitFor(() => {
    expect(editorText(domNode)).toContain('the original note body');
  });

  return { testEnv, services, domNode };
}

// `mountEditor` turns the passed node itself into the contenteditable
// ProseMirror root, so the editor content is the node's own content.
function editorText(domNode: HTMLElement): string {
  return domNode.textContent ?? '';
}

/**
 * Simulates a sync tool changing the file on disk: the storage adapter is
 * written to directly (no FileSystemService events fire), then the tagged
 * external event that a storage watcher would produce is emitted.
 */
async function simulateExternalEdit(
  testEnv: Awaited<ReturnType<typeof setupEditorWithNote>>['testEnv'],
  services: Awaited<ReturnType<typeof setupEditorWithNote>>['services'],
  content: string,
) {
  await services.fileStorageMemory.writeFile(
    NOTE_WS_PATH,
    new File([content], 'note.md', { type: 'text/plain' }),
  );
  testEnv.rootEmitter.emit('event::file:update', {
    type: 'file-content-update',
    wsPath: NOTE_WS_PATH,
    sender: EXTERNAL_SENDER,
  });
}

describe('editor refresh on external file changes', () => {
  it('replaces a clean editor with the external content without re-saving it', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');

    await simulateExternalEdit(
      testEnv,
      services,
      'updated by a sync tool elsewhere',
    );

    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('updated by a sync tool elsewhere');
      expect(editorText(domNode)).not.toContain('the original note body');
    });

    // Applying external content must not bounce a save back to storage —
    // that write would churn the file's mtime and make sync tools loop.
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('also refreshes on an external coarse refresh (force-update) event', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    await services.fileStorageMemory.writeFile(
      NOTE_WS_PATH,
      new File(['content after coarse refresh'], 'note.md', {
        type: 'text/plain',
      }),
    );
    testEnv.rootEmitter.emit('event::file:force-update', {
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('content after coarse refresh');
    });
  });

  it('never clobbers unsaved editor content: pending edits win over the external copy', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Wedge the save pipeline so the user's edit stays pending/unsaved.
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () => new Promise<void>(() => {}),
    );

    // Simulate the user typing (inserts at the current selection and
    // enqueues a save, which now hangs).
    expect(
      services.editorEngine.insertMarkdownAtSelection('USER-UNSAVED-EDIT'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('USER-UNSAVED-EDIT');
    });

    await simulateExternalEdit(
      testEnv,
      services,
      'external content that must not win',
    );

    // Give the sync path ample opportunity to (incorrectly) run.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(editorText(domNode)).toContain('USER-UNSAVED-EDIT');
    expect(editorText(domNode)).not.toContain(
      'external content that must not win',
    );
  });

  it('leaves the editor untouched when the external content is identical (echo)', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    const docBefore = domNode.innerHTML;

    await simulateExternalEdit(testEnv, services, 'the original note body\n');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(domNode.innerHTML).toBe(docBefore);
    expect(editorText(domNode)).toContain('the original note body');
  });
});
