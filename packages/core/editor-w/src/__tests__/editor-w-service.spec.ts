// @vitest-environment happy-dom

import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment, waitForExpect } from '@bangle.io/test-utils';
import { describe, expect, test } from 'vitest';

const TEST_WS_NAME = 'test-ws';
const NOTE_WS_PATH = `${TEST_WS_NAME}:note.md`;
const NOTE_CONTENT = '# Hello\n\nSome **markdown** content.\n';

async function setup() {
  const controller = new AbortController();
  const testEnv = createTestEnvironment({
    controller,
    editorEngineId: 'wordgard',
  });
  const services = testEnv.instantiateAll();
  await testEnv.mountAll();

  await services.workspaceOps.createWorkspaceInfo({
    name: TEST_WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });
  await services.fileSystem.createTextFile(NOTE_WS_PATH, NOTE_CONTENT);

  return {
    service: services.editorEngine,
    services,
    controller,
    mockLog: testEnv.mockLog,
  };
}

describe('EditorWService (M0b read-only stub)', () => {
  test('mounts a note read-only and renders its markdown source', async () => {
    const { service, controller } = await setup();
    const domNode = document.createElement('div');

    const cleanup = service.mountEditor({
      domNode,
      wsPath: NOTE_WS_PATH,
      name: 'main-editor',
    });

    await waitForExpect(() => {
      expect(domNode.dataset.editorWStatus).toBe('ready');
    });
    expect(domNode.textContent).toBe(NOTE_CONTENT);
    // Read-only stub: nothing is editable.
    expect(domNode.querySelector('[contenteditable="true"]')).toBeNull();
    expect(domNode.getAttribute('contenteditable')).toBeNull();

    cleanup();
    controller.abort();
  });

  test('mountEditor is idempotent per dom node', async () => {
    const { service, controller } = await setup();
    const domNode = document.createElement('div');

    const cleanup1 = service.mountEditor({
      domNode,
      wsPath: NOTE_WS_PATH,
      name: 'main-editor',
    });
    const cleanup2 = service.mountEditor({
      domNode,
      wsPath: NOTE_WS_PATH,
      name: 'main-editor',
    });

    await waitForExpect(() => {
      expect(domNode.dataset.editorWStatus).toBe('ready');
    });
    expect(domNode.textContent).toBe(NOTE_CONTENT);

    cleanup2();
    cleanup1();
    controller.abort();
  });

  test('a missing note renders empty without writing anything (mirrors the PM engine)', async () => {
    const { service, services, controller } = await setup();
    const domNode = document.createElement('div');
    const missingWsPath = `${TEST_WS_NAME}:missing.md`;

    const cleanup = service.mountEditor({
      domNode,
      wsPath: missingWsPath,
      name: 'main-editor',
    });

    await waitForExpect(() => {
      expect(domNode.dataset.editorWStatus).toBe('ready');
    });
    expect(domNode.textContent).toBe('');
    // Rendering the empty state must not have created the file.
    await expect(services.fileSystem.exists(missingWsPath)).resolves.toBe(
      false,
    );

    cleanup();
    controller.abort();
  });

  test('a failed load shows an error state and never writes anything', async () => {
    const { service, controller, mockLog } = await setup();
    const domNode = document.createElement('div');
    // A workspace that does not exist makes the read itself fail.
    const unreadableWsPath = 'unknown-ws:missing.md';

    const cleanup = service.mountEditor({
      domNode,
      wsPath: unreadableWsPath,
      name: 'main-editor',
    });

    await waitForExpect(() => {
      expect(domNode.dataset.editorWStatus).toBe('failed');
    });
    expect(domNode.textContent).toBe(t.app.editorW.loadFailed);
    expect(mockLog.error).toHaveBeenCalled();

    cleanup();
    controller.abort();
  });

  test('save-related contract methods report a permanently clean state', async () => {
    const { service, controller } = await setup();

    expect(service.engineId).toBe('wordgard');
    expect(service.hasPendingOrFailedSave()).toBe(false);
    expect(service.hasPendingOrFailedSave(NOTE_WS_PATH)).toBe(false);
    expect(service.retryFailedSave(NOTE_WS_PATH)).toBe(false);
    expect(service.getSelectionMarkdown()).toBeNull();
    expect(service.insertMarkdownAtSelection('# nope')).toBe(false);
    expect(service.toggleHeadingCollapse()).toBe(false);
    expect(service.collapseAllHeadings(1)).toBe(false);
    expect(service.uncollapseAllHeadings()).toBe(false);

    const unsubscribe = service.subscribeToSaveStatus(() => {});
    expect(() => unsubscribe()).not.toThrow();

    controller.abort();
  });

  test('rejects non-markdown paths before touching storage', async () => {
    const { service, controller } = await setup();
    const domNode = document.createElement('div');

    expect(() =>
      service.mountEditor({
        domNode,
        wsPath: `${TEST_WS_NAME}:image.png`,
        name: 'main-editor',
      }),
    ).toThrow();

    controller.abort();
  });
});
