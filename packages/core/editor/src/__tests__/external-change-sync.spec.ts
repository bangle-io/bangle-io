// @vitest-environment jsdom

import {
  EXTERNAL_FILE_CHANGE_SENDER_TAG,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { toast } from '@bangle.io/ui-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PmEditorService } from '../pm-editor-service';

function asPmEditor(editorEngine: unknown): PmEditorService {
  if (!(editorEngine instanceof PmEditorService)) {
    throw new Error('expected the ProseMirror editor engine');
  }
  return editorEngine;
}

const WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${WS_NAME}:note.md`;
const EXTERNAL_SENDER = {
  id: 'other-source',
  tag: EXTERNAL_FILE_CHANGE_SENDER_TAG,
};

let cleanupControllers: AbortController[] = [];
let cleanupDomNodes: HTMLElement[] = [];

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
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

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'updated by a sync tool elsewhere',
        );
        expect(editorText(domNode)).not.toContain('the original note body');
      },
      { timeout: 3_000 },
    );

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

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('content after coarse refresh');
      },
      { timeout: 3_000 },
    );
  });

  it('never clobbers unsaved editor content: pending edits win over the external copy', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Wedge the save pipeline so the user's edit stays pending/unsaved.
    // Resolvable at the end: the save queue store is a module-level
    // singleton (production wiring), so a forever-pending entry would leak
    // a dirty state for this wsPath into later tests.
    let releaseSave = () => {};
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
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

    // Give the sync path ample opportunity to (incorrectly) run — well past
    // its quiet-period and stability-read delays.
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(editorText(domNode)).toContain('USER-UNSAVED-EDIT');
    expect(editorText(domNode)).not.toContain(
      'external content that must not win',
    );

    // Unwedge the save so the shared queue store returns to clean.
    releaseSave();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });

  it('does not apply a transient mid-write read; it settles on the final content', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Simulate a truncate-then-write external editor: the first read after
    // the watcher event sees an empty file, later reads see the final
    // content. The empty snapshot must never reach the editor.
    const realRead = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    const readSpy = vi
      .spyOn(services.fileSystem, 'readFileAsText')
      .mockImplementation(realRead);
    readSpy.mockImplementationOnce(async () => '');

    await simulateExternalEdit(testEnv, services, 'final synced content');

    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain('final synced content');
      },
      { timeout: 3_000 },
    );
    // The transient empty read never replaced the doc: had it been applied,
    // the placeholder-empty doc would have been visible and, worse, the
    // final content would only arrive via a second watcher event that this
    // simulation never sends.
  });

  it('applies external content to a note loaded after another note primed the markdown loader', async () => {
    // Regression: markdown loaders are schema-bound and every editor builds
    // its own schema. Loading one note first (its load-time fidelity check
    // primes the loader) must not make a later note's external sync parse
    // with a foreign schema — that silently produced an empty document.
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    const otherWsPath = `${WS_NAME}:other.md`;
    await services.fileSystem.createTextFile(otherWsPath, 'other note');
    const otherDomNode = document.createElement('div');
    document.body.append(otherDomNode);
    cleanupDomNodes.push(otherDomNode);
    services.editorEngine.mountEditor({
      domNode: otherDomNode,
      wsPath: otherWsPath,
      name: 'second-test-editor',
      focus: false,
    });
    await vi.waitFor(() => {
      expect(otherDomNode.textContent).toContain('other note');
    });

    await services.fileStorageMemory.writeFile(
      otherWsPath,
      new File(['other note updated externally'], 'other.md', {
        type: 'text/plain',
      }),
    );
    testEnv.rootEmitter.emit('event::file:update', {
      type: 'file-content-update',
      wsPath: otherWsPath,
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(
      () => {
        expect(otherDomNode.textContent).toContain(
          'other note updated externally',
        );
      },
      { timeout: 3_000 },
    );
    // The first editor is untouched.
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('refuses external content that does not round-trip (fidelity gate)', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Reference-style links resolve to inline links in the schema, so
    // serializing rewrites the source — exactly the lossy shape the load
    // path refuses. The external sync must refuse it too: applying it would
    // let the user's next keystroke save the rewritten note.
    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][1]\n\n[1]: https://example.com/spec\n',
    );

    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain('the spec');
  });

  it('never blanks a non-empty note from an external truncation', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // A truncate-then-write writer can stay empty across both stability
    // reads. Emptying the note is the destructive shape of that race, so it
    // is never auto-applied.
    await simulateExternalEdit(testEnv, services, '');

    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('a workspace-scoped refresh does not touch editors in other workspaces', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    // Mount a second editor in a different workspace.
    const OTHER_WS = 'other-ws';
    await services.workspaceOps.createWorkspaceInfo({
      name: OTHER_WS,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    const otherWsPath = `${OTHER_WS}:note.md`;
    await services.fileSystem.createTextFile(otherWsPath, 'other ws note');
    const otherDomNode = document.createElement('div');
    document.body.append(otherDomNode);
    cleanupDomNodes.push(otherDomNode);
    services.editorEngine.mountEditor({
      domNode: otherDomNode,
      wsPath: otherWsPath,
      name: 'other-ws-editor',
      focus: false,
    });
    await vi.waitFor(() => {
      expect(otherDomNode.textContent).toContain('other ws note');
    });

    // Change BOTH notes on storage, then send a refresh scoped to OTHER_WS.
    await services.fileStorageMemory.writeFile(
      NOTE_WS_PATH,
      new File(['changed but out of scope'], 'note.md', {
        type: 'text/plain',
      }),
    );
    await services.fileStorageMemory.writeFile(
      otherWsPath,
      new File(['other ws refreshed'], 'note.md', { type: 'text/plain' }),
    );
    testEnv.rootEmitter.emit('event::file:force-update', {
      wsName: OTHER_WS,
      sender: EXTERNAL_SENDER,
    });

    await vi.waitFor(
      () => {
        expect(otherDomNode.textContent).toContain('other ws refreshed');
      },
      { timeout: 3_000 },
    );
    // The first workspace's editor was outside the refresh scope: untouched
    // even though its file changed on storage.
    expect(editorText(domNode)).toContain('the original note body');
    expect(editorText(domNode)).not.toContain('changed but out of scope');
  });

  it('leaves the editor untouched when the external content is identical (echo)', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    const docBefore = domNode.innerHTML;

    await simulateExternalEdit(testEnv, services, 'the original note body\n');
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(domNode.innerHTML).toBe(docBefore);
    expect(editorText(domNode)).toContain('the original note body');
  });

  it('surfaces a refusal as a per-note warning toast and withdraws it once reconciled', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const warningSpy = vi.spyOn(toast, 'warning');
    const dismissSpy = vi.spyOn(toast, 'dismiss');
    const expectedToastId = `external-stale-content:${NOTE_WS_PATH}`;

    // Content the fidelity gate refuses: without a user-visible surface the
    // editor would silently show older content than disk forever.
    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][1]\n\n[1]: https://example.com/spec\n',
    );
    await vi.waitFor(
      () => {
        expect(warningSpy).toHaveBeenCalled();
      },
      { timeout: 3_000 },
    );
    const [message, options] = warningSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('note.md');
    expect(options?.id).toBe(expectedToastId);
    // The refusal itself still holds — the editor keeps the current note.
    expect(editorText(domNode)).toContain('the original note body');

    // The sync tool then writes content the editor can apply: the stale
    // notice is withdrawn instead of lingering over reconciled state.
    await simulateExternalEdit(
      testEnv,
      services,
      'clean content after the conflict',
    );
    await vi.waitFor(
      () => {
        expect(editorText(domNode)).toContain(
          'clean content after the conflict',
        );
      },
      { timeout: 3_000 },
    );
    expect(dismissSpy).toHaveBeenCalledWith(expectedToastId);
  });
  it('loading the disk version applies refused content in place without writing back', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );
    const dismissSpy = vi.spyOn(toast, 'dismiss');

    // Fidelity-refused external content: the editor keeps the current note.
    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][1]\n\n[1]: https://example.com/spec\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(editorText(domNode)).toContain('the original note body');

    // The user consents via the toast action: the disk version replaces
    // only this note's editors — no UI reload, no other editor touched.
    const writeSpy = vi.spyOn(services.fileSystem, 'writeFile');
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(editorText(domNode)).toContain('the spec');
    expect(editorText(domNode)).not.toContain('the original note body');
    // Consented content equals disk: writing it back would churn mtime.
    expect(writeSpy).not.toHaveBeenCalled();
    expect(dismissSpy).toHaveBeenCalledWith(
      `external-stale-content:${NOTE_WS_PATH}`,
    );
  });

  it('loading the disk version refuses to clobber edits made since the refusal', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][1]\n\n[1]: https://example.com/spec\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 700));

    // The user typed after the refusal toast appeared; wedge the save so
    // the edit stays pending (same module-level queue caveat as above).
    let releaseSave = () => {};
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );
    expect(
      services.editorEngine.insertMarkdownAtSelection('USER-EDIT-AFTER-TOAST'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('USER-EDIT-AFTER-TOAST');
    });

    // Their unsaved edit exists nowhere else: the disk version must lose.
    await asPmEditor(services.editorEngine).loadDiskVersionIntoEditors(
      NOTE_WS_PATH,
    );

    expect(editorText(domNode)).toContain('USER-EDIT-AFTER-TOAST');
    expect(editorText(domNode)).not.toContain('the spec');

    releaseSave();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });

  it('loading the disk version refuses edits made while the disk read is pending', async () => {
    const { testEnv, services, domNode } = await setupEditorWithNote(
      'the original note body',
    );

    await simulateExternalEdit(
      testEnv,
      services,
      'see [the spec][1]\n\n[1]: https://example.com/spec\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 700));

    const readStarted = createDeferred<void>();
    const allowRead = createDeferred<void>();
    const originalRead = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    vi.spyOn(services.fileSystem, 'readFileAsText').mockImplementation(
      async (...args) => {
        readStarted.resolve();
        await allowRead.promise;
        return originalRead(...args);
      },
    );

    let releaseSave = () => {};
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );

    const loadPromise = asPmEditor(
      services.editorEngine,
    ).loadDiskVersionIntoEditors(NOTE_WS_PATH);
    await readStarted.promise;

    expect(
      services.editorEngine.insertMarkdownAtSelection('EDIT-DURING-DISK-READ'),
    ).toBe(true);
    await vi.waitFor(() => {
      expect(editorText(domNode)).toContain('EDIT-DURING-DISK-READ');
    });

    allowRead.resolve();
    await loadPromise;

    expect(editorText(domNode)).toContain('EDIT-DURING-DISK-READ');
    expect(editorText(domNode)).not.toContain('the spec');

    releaseSave();
    await vi.waitFor(() => {
      expect(services.editorEngine.hasPendingOrFailedSave()).toBe(false);
    });
  });
});
