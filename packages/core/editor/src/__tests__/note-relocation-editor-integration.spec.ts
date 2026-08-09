// @vitest-environment jsdom

import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { WsFilePath } from '@bangle.io/ws-path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditorSaveCoordinator } from '../editor-save-queue';
import { PmEditorService } from '../pm-editor-service';

const WS_NAME = 'test-ws';
const SOURCE_WS_PATH = `${WS_NAME}:notes/source.md`;
const DESTINATION_WS_PATH = `${WS_NAME}:archive/source.md`;
const TARGET_WS_PATH = `${WS_NAME}:notes/target.md`;

let controllers: AbortController[] = [];
let domNodes: HTMLElement[] = [];

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  for (const controller of controllers) {
    controller.abort();
  }
  controllers = [];
  for (const domNode of domNodes) {
    domNode.remove();
  }
  domNodes = [];
});

function asPmEditor(editorEngine: unknown): PmEditorService {
  if (!(editorEngine instanceof PmEditorService)) {
    throw new Error('Expected the ProseMirror editor engine');
  }
  return editorEngine;
}

describe('open-note relocation', () => {
  it('keeps rebased links after an unrelated edit and reload', async () => {
    const controller = new AbortController();
    controllers.push(controller);
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    await services.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      SOURCE_WS_PATH,
      [
        'body',
        '',
        '[Open linked note](./target.md)',
        '',
        '![Relocation image](./assets/relocation.png)',
      ].join('\n'),
    );
    await services.fileSystem.createTextFile(TARGET_WS_PATH, 'target body');
    await services.fileSystem.createTextFile(
      `${WS_NAME}:notes/assets/relocation.png`,
      'not-an-image',
    );

    const domNode = document.createElement('div');
    document.body.append(domNode);
    domNodes.push(domNode);
    const unmount = services.editorEngine.mountEditor({
      domNode,
      name: 'relocation-editor',
      wsPath: SOURCE_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() => expect(domNode.textContent).toContain('body'));

    const destinationWriteStarted = createDeferred<void>();
    const allowDestinationWrite = createDeferred<void>();
    const writeFile = services.fileSystem.writeFile.bind(services.fileSystem);
    let delayed = false;
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      async (wsPath, file) => {
        if (wsPath === DESTINATION_WS_PATH && !delayed) {
          delayed = true;
          destinationWriteStarted.resolve();
          await allowDestinationWrite.promise;
        }
        await writeFile(wsPath, file);
      },
    );

    const relocation = services.noteRelocation.relocate({
      destination: WsFilePath.fromString(DESTINATION_WS_PATH),
      source: WsFilePath.fromString(SOURCE_WS_PATH),
    });
    await destinationWriteStarted.promise;

    // PageEditor uses wsPath in its key, so route updates can replace the
    // view during the destination write. The late mount must not retain the
    // pre-rewrite read it began after the rename.
    unmount();
    const lateMountDomNode = document.createElement('div');
    document.body.append(lateMountDomNode);
    domNodes.push(lateMountDomNode);
    const unmountLateMount = services.editorEngine.mountEditor({
      domNode: lateMountDomNode,
      name: 'late-relocation-editor',
      wsPath: DESTINATION_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() =>
      expect(lateMountDomNode.querySelector('a')).toBeNull(),
    );
    allowDestinationWrite.resolve();
    await expect(relocation).resolves.toMatchObject({
      rewrittenReferences: 2,
      warnings: [],
    });
    await vi.waitFor(() => {
      expect(lateMountDomNode.querySelector('a')?.getAttribute('href')).toBe(
        '../notes/target.md',
      );
    });

    const editor = asPmEditor(services.editorEngine).getEditor(
      'late-relocation-editor',
    );
    if (!editor) {
      throw new Error('Expected mounted editor');
    }
    expect(editor.dom.querySelector('a')?.getAttribute('href')).toBe(
      '../notes/target.md',
    );
    editor.dispatch(editor.state.tr.insertText('changed ', 1));

    await vi.waitFor(async () => {
      expect(
        services.editorEngine.hasPendingOrFailedSave(DESTINATION_WS_PATH),
      ).toBe(false);
      await expect(
        services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
      ).resolves.toContain('[Open linked note](../notes/target.md)');
      await expect(
        services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
      ).resolves.toContain(
        '![Relocation image](../notes/assets/relocation.png)',
      );
    });

    unmountLateMount();
    const reloadedDomNode = document.createElement('div');
    document.body.append(reloadedDomNode);
    domNodes.push(reloadedDomNode);
    services.editorEngine.mountEditor({
      domNode: reloadedDomNode,
      name: 'reloaded-relocation-editor',
      wsPath: DESTINATION_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() => {
      expect(reloadedDomNode.textContent).toContain('changed body');
      expect(reloadedDomNode.querySelector('a')?.getAttribute('href')).toBe(
        '../notes/target.md',
      );
    });
  });

  it('uses the relocation handoff when a destination read finishes after the rewrite', async () => {
    const controller = new AbortController();
    controllers.push(controller);
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    await services.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      SOURCE_WS_PATH,
      '[Open linked note](./target.md)',
    );
    await services.fileSystem.createTextFile(TARGET_WS_PATH, 'target body');

    const sourceDomNode = document.createElement('div');
    document.body.append(sourceDomNode);
    domNodes.push(sourceDomNode);
    const unmountSource = services.editorEngine.mountEditor({
      domNode: sourceDomNode,
      name: 'source-relocation-editor',
      wsPath: SOURCE_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() =>
      expect(sourceDomNode.querySelector('a')).toBeTruthy(),
    );

    const relocationHandoffStarted = createDeferred<void>();
    const allowRelocationHandoff = createDeferred<void>();
    const pmEditor = asPmEditor(services.editorEngine);
    const writeRelocatedMarkdown =
      pmEditor.writeRelocatedMarkdown.bind(pmEditor);
    vi.spyOn(pmEditor, 'writeRelocatedMarkdown').mockImplementation(
      async (params) => {
        relocationHandoffStarted.resolve();
        await allowRelocationHandoff.promise;
        return writeRelocatedMarkdown(params);
      },
    );

    const relocation = services.noteRelocation.relocate({
      destination: WsFilePath.fromString(DESTINATION_WS_PATH),
      source: WsFilePath.fromString(SOURCE_WS_PATH),
    });
    // The durable rename has succeeded, but the editor handoff is not yet
    // installed. A route change can mount the destination in this gap.
    await relocationHandoffStarted.promise;

    const destinationReadStarted = createDeferred<void>();
    const allowDestinationRead = createDeferred<void>();
    const readFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    let delayedRead = false;
    vi.spyOn(services.fileSystem, 'readFileAsText').mockImplementation(
      async (wsPath, options) => {
        const content = await readFileAsText(wsPath, options);
        if (wsPath === DESTINATION_WS_PATH && !delayedRead) {
          delayedRead = true;
          destinationReadStarted.resolve();
          await allowDestinationRead.promise;
        }
        return content;
      },
    );

    unmountSource();
    const destinationDomNode = document.createElement('div');
    document.body.append(destinationDomNode);
    domNodes.push(destinationDomNode);
    services.editorEngine.mountEditor({
      domNode: destinationDomNode,
      name: 'slow-destination-read-editor',
      wsPath: DESTINATION_WS_PATH,
      focus: false,
    });
    await destinationReadStarted.promise;

    // Install, durably write, and complete the handoff before returning the
    // destination loader's stale disk snapshot. The in-flight load must still
    // select the relocation Markdown after cleanup would otherwise occur.
    allowRelocationHandoff.resolve();
    await expect(relocation).resolves.toMatchObject({
      rewrittenReferences: 1,
      warnings: [],
    });
    allowDestinationRead.resolve();

    await vi.waitFor(() => {
      expect(destinationDomNode.querySelector('a')?.getAttribute('href')).toBe(
        '../notes/target.md',
      );
    });
  });

  it('restores the view editable predicate after applying a relocation rewrite', async () => {
    const controller = new AbortController();
    controllers.push(controller);
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    await services.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(SOURCE_WS_PATH, '[[./target]]');
    await services.fileSystem.createTextFile(TARGET_WS_PATH, 'target body');

    const domNode = document.createElement('div');
    document.body.append(domNode);
    domNodes.push(domNode);
    services.editorEngine.mountEditor({
      domNode,
      name: 'noneditable-relocation-editor',
      wsPath: SOURCE_WS_PATH,
      focus: false,
    });
    const pmEditor = asPmEditor(services.editorEngine);
    await vi.waitFor(() =>
      expect(pmEditor.getEditor('noneditable-relocation-editor')).toBeDefined(),
    );
    const editor = pmEditor.getEditor('noneditable-relocation-editor');
    if (!editor) {
      throw new Error('Expected mounted editor');
    }
    const originalEditable = () => false;
    editor.setProps({ editable: originalEditable });

    await expect(
      services.noteRelocation.relocate({
        destination: WsFilePath.fromString(DESTINATION_WS_PATH),
        source: WsFilePath.fromString(SOURCE_WS_PATH),
      }),
    ).resolves.toMatchObject({ rewrittenReferences: 1, warnings: [] });

    expect(editor.props.editable).toBe(originalEditable);
  });

  it('shares an in-flight relocation handoff with a replacement service graph', async () => {
    const firstController = new AbortController();
    const secondController = new AbortController();
    controllers.push(firstController, secondController);
    const saveCoordinator = createEditorSaveCoordinator();
    const firstTestEnv = createTestEnvironment({
      controller: firstController,
      editorSaveCoordinator: saveCoordinator,
    });
    const firstServices = firstTestEnv.instantiateAll();
    await firstTestEnv.mountAll();
    await firstServices.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await firstServices.fileSystem.createTextFile(
      SOURCE_WS_PATH,
      ['body', '', '[Open linked note](./target.md)'].join('\n'),
    );
    await firstServices.fileSystem.createTextFile(
      TARGET_WS_PATH,
      'target body',
    );

    const sourceDomNode = document.createElement('div');
    document.body.append(sourceDomNode);
    domNodes.push(sourceDomNode);
    firstServices.editorEngine.mountEditor({
      domNode: sourceDomNode,
      name: 'reload-source-editor',
      wsPath: SOURCE_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() =>
      expect(sourceDomNode.querySelector('a')?.getAttribute('href')).toBe(
        './target.md',
      ),
    );

    const destinationWriteStarted = createDeferred<void>();
    const allowDestinationWrite = createDeferred<void>();
    const firstWriteFile = firstServices.fileSystem.writeFile.bind(
      firstServices.fileSystem,
    );
    let delayedWrite = false;
    vi.spyOn(firstServices.fileSystem, 'writeFile').mockImplementation(
      async (wsPath, file) => {
        if (wsPath === DESTINATION_WS_PATH && !delayedWrite) {
          delayedWrite = true;
          destinationWriteStarted.resolve();
          await allowDestinationWrite.promise;
        }
        await firstWriteFile(wsPath, file);
      },
    );

    const relocation = firstServices.noteRelocation.relocate({
      destination: WsFilePath.fromString(DESTINATION_WS_PATH),
      source: WsFilePath.fromString(SOURCE_WS_PATH),
    });
    await destinationWriteStarted.promise;

    // A UI reload creates a fresh editor service graph while retaining only
    // browser-root state. Seed its persistent-storage equivalent with the
    // post-rename bytes the new graph would read from disk.
    const secondTestEnv = createTestEnvironment({
      controller: secondController,
      editorSaveCoordinator: saveCoordinator,
    });
    const secondServices = secondTestEnv.instantiateAll();
    await secondTestEnv.mountAll();
    await secondServices.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await secondServices.fileSystem.createTextFile(
      DESTINATION_WS_PATH,
      ['body', '', '[Open linked note](./target.md)'].join('\n'),
    );
    await secondServices.fileSystem.createTextFile(
      TARGET_WS_PATH,
      'target body',
    );

    const destinationDomNode = document.createElement('div');
    document.body.append(destinationDomNode);
    domNodes.push(destinationDomNode);
    secondServices.editorEngine.mountEditor({
      domNode: destinationDomNode,
      name: 'reload-destination-editor',
      wsPath: DESTINATION_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() =>
      expect(destinationDomNode.querySelector('a')).toBeNull(),
    );

    allowDestinationWrite.resolve();
    await expect(relocation).resolves.toMatchObject({
      rewrittenReferences: 1,
      warnings: [],
    });
    await vi.waitFor(() => {
      expect(destinationDomNode.querySelector('a')?.getAttribute('href')).toBe(
        '../notes/target.md',
      );
    });

    const reloadedEditor = asPmEditor(secondServices.editorEngine).getEditor(
      'reload-destination-editor',
    );
    if (!reloadedEditor) {
      throw new Error('Expected editor from replacement service graph');
    }
    reloadedEditor.dispatch(reloadedEditor.state.tr.insertText('changed ', 1));
    await vi.waitFor(async () => {
      expect(
        secondServices.editorEngine.hasPendingOrFailedSave(DESTINATION_WS_PATH),
      ).toBe(false);
      await expect(
        secondServices.fileSystem.readFileAsText(DESTINATION_WS_PATH),
      ).resolves.toContain('[Open linked note](../notes/target.md)');
    });
  });

  it('re-reads durable content when a relocation write fails', async () => {
    const controller = new AbortController();
    controllers.push(controller);
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    await services.workspaceOps.createWorkspaceInfo({
      name: WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      SOURCE_WS_PATH,
      '[Open linked note](./target.md)',
    );
    await services.fileSystem.createTextFile(TARGET_WS_PATH, 'target body');

    const sourceDomNode = document.createElement('div');
    document.body.append(sourceDomNode);
    domNodes.push(sourceDomNode);
    const unmountSource = services.editorEngine.mountEditor({
      domNode: sourceDomNode,
      name: 'failing-source-relocation-editor',
      wsPath: SOURCE_WS_PATH,
      focus: false,
    });
    await vi.waitFor(() =>
      expect(sourceDomNode.querySelector('a')).toBeTruthy(),
    );

    const destinationWriteStarted = createDeferred<void>();
    const failDestinationWrite = createDeferred<void>();
    const writeFile = services.fileSystem.writeFile.bind(services.fileSystem);
    let failingWrite = true;
    vi.spyOn(services.fileSystem, 'writeFile').mockImplementation(
      async (wsPath, file) => {
        if (wsPath === DESTINATION_WS_PATH && failingWrite) {
          failingWrite = false;
          destinationWriteStarted.resolve();
          await failDestinationWrite.promise;
          throw new Error('destination write failed');
        }
        await writeFile(wsPath, file);
      },
    );

    const relocation = services.noteRelocation.relocate({
      destination: WsFilePath.fromString(DESTINATION_WS_PATH),
      source: WsFilePath.fromString(SOURCE_WS_PATH),
    });
    await destinationWriteStarted.promise;

    const destinationReadStarted = createDeferred<void>();
    const readFileAsText = services.fileSystem.readFileAsText.bind(
      services.fileSystem,
    );
    let observedDestinationRead = false;
    vi.spyOn(services.fileSystem, 'readFileAsText').mockImplementation(
      async (wsPath, options) => {
        if (wsPath === DESTINATION_WS_PATH && !observedDestinationRead) {
          observedDestinationRead = true;
          destinationReadStarted.resolve();
        }
        return readFileAsText(wsPath, options);
      },
    );

    unmountSource();
    const destinationDomNode = document.createElement('div');
    document.body.append(destinationDomNode);
    domNodes.push(destinationDomNode);
    services.editorEngine.mountEditor({
      domNode: destinationDomNode,
      name: 'failing-destination-relocation-editor',
      wsPath: DESTINATION_WS_PATH,
      focus: false,
    });
    await destinationReadStarted.promise;

    // The destination loader has captured the proposed handoff, but it must
    // not mount that content until the queued write has a durable outcome.
    await vi.waitFor(() => {
      expect(destinationDomNode.querySelector('a')).toBeNull();
    });
    failDestinationWrite.resolve();
    await expect(relocation).rejects.toThrow('restored to its original path');

    await vi.waitFor(async () => {
      await expect(
        services.fileSystem.readFileAsText(SOURCE_WS_PATH),
      ).resolves.toBe('[Open linked note](./target.md)');
      await expect(
        services.fileSystem.readFileAsText(DESTINATION_WS_PATH),
      ).resolves.toBeUndefined();
      expect(destinationDomNode.textContent).not.toContain('Open linked note');
      expect(destinationDomNode.querySelector('a')).toBeNull();
    });
  });
});
