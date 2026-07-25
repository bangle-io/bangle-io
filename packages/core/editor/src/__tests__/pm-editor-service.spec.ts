// @vitest-environment happy-dom

import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { TextSelection } from '@bangle.io/prosemirror-plugins';
import { createTestEnvironment, waitForExpect } from '@bangle.io/test-utils';
import { describe, expect, test } from 'vitest';
import { PmEditorService } from '../pm-editor-service';

const TEST_WS_NAME = 'test-ws';

describe('PmEditorService', () => {
  test('parses Markdown with the active editor schema across sessions', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:first.md`,
      'First note',
    );
    await services.fileSystem.createTextFile(`${TEST_WS_NAME}:second.md`, '');

    expect(services.editorEngine).toBeInstanceOf(PmEditorService);
    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;
    const firstDomNode = document.createElement('div');
    const secondDomNode = document.createElement('div');
    document.body.append(firstDomNode, secondDomNode);

    const unmountFirst = service.mountEditor({
      domNode: firstDomNode,
      wsPath: `${TEST_WS_NAME}:first.md`,
      name: 'first-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('first-editor')).toBeDefined();
    });

    const unmountSecond = service.mountEditor({
      domNode: secondDomNode,
      wsPath: `${TEST_WS_NAME}:second.md`,
      name: 'second-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('second-editor')).toBeDefined();
    });

    const firstEditor = service.getEditor('first-editor');
    const secondEditor = service.getEditor('second-editor');
    expect(firstEditor).toBeDefined();
    expect(secondEditor).toBeDefined();
    if (!firstEditor || !secondEditor) {
      throw new Error('Expected both ProseMirror editors to be ready');
    }
    expect(secondEditor.state.schema).not.toBe(firstEditor.state.schema);

    secondEditor.focus();
    expect(service.insertMarkdownAtSelection('**from Markdown**')).toBe(true);
    expect(secondEditor.state.doc.textContent).toBe('from Markdown');
    const boldMark = secondEditor.state.schema.marks.bold;
    expect(boldMark).toBeDefined();
    expect(
      secondEditor.state.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type === boldMark,
      ),
    ).toBe(true);
    expect(firstEditor.state.doc.textContent).toBe('First note');

    const secondDocAfterSafePaste = secondEditor.state.doc;
    secondEditor.dispatch(
      secondEditor.state.tr.setSelection(
        TextSelection.create(
          secondEditor.state.doc,
          1,
          secondEditor.state.doc.content.size - 1,
        ),
      ),
    );
    expect(
      service.insertMarkdownAtSelection(
        '[visible][missing]\n\n[unused]: https://example.com',
      ),
    ).toBe(false);
    expect(secondEditor.state.doc).toBe(secondDocAfterSafePaste);

    secondEditor.focus();
    const capturedInsertion = service.captureMarkdownInsertion();
    expect(capturedInsertion).not.toBeNull();
    firstEditor.focus();
    expect(capturedInsertion?.('wrong editor')).toBe(false);
    expect(firstEditor.state.doc.textContent).toBe('First note');
    expect(secondEditor.state.doc.textContent).toBe('from Markdown');

    unmountSecond();
    unmountFirst();
    controller.abort();
    firstDomNode.remove();
    secondDomNode.remove();
  });

  test('toggleHeading and insertTable act on the active editor', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:note.md`,
      'Toggle me',
    );

    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;
    const domNode = document.createElement('div');
    document.body.append(domNode);

    const unmount = service.mountEditor({
      domNode,
      wsPath: `${TEST_WS_NAME}:note.md`,
      name: 'note-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('note-editor')).toBeDefined();
    });
    const view = service.getEditor('note-editor');
    if (!view) {
      throw new Error('Expected the editor to be ready');
    }
    view.focus();

    expect(
      service.isActionAvailable({ type: 'toggle-heading', level: 2 }),
    ).toBe(true);
    expect(service.isActionAvailable({ type: 'insert-table' })).toBe(true);

    expect(service.toggleHeading(2)).toBe(true);
    expect(view.state.doc.firstChild?.type.name).toBe('heading');
    expect(view.state.doc.firstChild?.attrs.level).toBe(2);

    // Toggling the same level converts back to a paragraph.
    expect(service.toggleHeading(2)).toBe(true);
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');

    expect(service.insertTable()).toBe(true);
    let hasTable = false;
    view.state.doc.descendants((node) => {
      if (node.type.name === 'table') {
        hasTable = true;
      }
      return !hasTable;
    });
    expect(hasTable).toBe(true);
    expect(
      service.isActionAvailable({ type: 'toggle-heading', level: 1 }),
    ).toBe(false);
    expect(service.isActionAvailable({ type: 'insert-table' })).toBe(false);

    unmount();
    await waitForExpect(() => {
      expect(service.getEditor('note-editor')).toBeUndefined();
    });
    // With no active editor both refuse instead of throwing.
    expect(service.toggleHeading(1)).toBe(false);
    expect(service.insertTable()).toBe(false);
    expect(
      service.isActionAvailable({ type: 'toggle-heading', level: 1 }),
    ).toBe(false);

    controller.abort();
    domNode.remove();
  });

  test('selectAllInActiveEditor redirects select-all into an unfocused editor', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:note.md`,
      'Alpha\n\nBeta',
    );

    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;

    // With no editor mounted the shortcut declines, so native (document-wide)
    // select-all still runs on non-editor pages.
    expect(service.selectAllInActiveEditor()).toBe(false);

    const domNode = document.createElement('div');
    const outsideInput = document.createElement('input');
    document.body.append(domNode, outsideInput);

    const unmount = service.mountEditor({
      domNode,
      wsPath: `${TEST_WS_NAME}:note.md`,
      name: 'note-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('note-editor')).toBeDefined();
    });
    const view = service.getEditor('note-editor');
    if (!view) {
      throw new Error('Expected the editor to be ready');
    }

    // With no meaningful focus owner, the app-level shortcut redirects
    // select-all into the last active editor.
    view.dom.blur();
    expect(view.hasFocus()).toBe(false);

    expect(service.selectAllInActiveEditor()).toBe(true);
    expect(view.hasFocus()).toBe(true);
    expect(view.state.selection.from).toBe(0);
    expect(view.state.selection.to).toBe(view.state.doc.content.size);

    const nestedEditor = document.createElement('div');
    nestedEditor.contentEditable = 'true';
    view.dom.append(nestedEditor);
    nestedEditor.focus();
    expect(view.hasFocus()).toBe(false);
    expect(service.selectAllInActiveEditor()).toBe(false);
    expect(document.activeElement).toBe(nestedEditor);

    outsideInput.focus();
    expect(service.selectAllInActiveEditor()).toBe(false);
    expect(document.activeElement).toBe(outsideInput);

    // While the editor already owns focus its own keymap handles select-all,
    // so the service declines and leaves the live selection untouched.
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 1)),
    );
    expect(service.selectAllInActiveEditor()).toBe(false);
    expect(view.state.selection.empty).toBe(true);
    expect(view.state.selection.from).toBe(1);

    unmount();
    controller.abort();
    nestedEditor.remove();
    domNode.remove();
    outsideInput.remove();
  });

  test('keeps the last active editor while another surface owns focus', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(`${TEST_WS_NAME}:first.md`, '');
    await services.fileSystem.createTextFile(`${TEST_WS_NAME}:second.md`, '');

    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;
    const firstDomNode = document.createElement('div');
    const secondDomNode = document.createElement('div');
    const omniInput = document.createElement('input');
    document.body.append(firstDomNode, secondDomNode, omniInput);

    const unmountFirst = service.mountEditor({
      domNode: firstDomNode,
      wsPath: `${TEST_WS_NAME}:first.md`,
      name: 'first-editor',
    });
    const unmountSecond = service.mountEditor({
      domNode: secondDomNode,
      wsPath: `${TEST_WS_NAME}:second.md`,
      name: 'second-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('first-editor')).toBeDefined();
      expect(service.getEditor('second-editor')).toBeDefined();
    });

    const firstEditor = service.getEditor('first-editor');
    const secondEditor = service.getEditor('second-editor');
    if (!firstEditor || !secondEditor) {
      throw new Error('Expected both ProseMirror editors to be ready');
    }

    firstEditor.focus();
    expect(service.insertTable()).toBe(true);

    secondEditor.focus();
    omniInput.focus();

    // The first service lookup happens only after focus leaves the editor:
    // availability and execution must still target the editor that opened the
    // external surface, rather than falling back to mount order.
    expect(
      service.isActionAvailable({ type: 'toggle-heading', level: 1 }),
    ).toBe(true);
    expect(service.toggleHeading(1)).toBe(true);
    expect(secondEditor.state.doc.firstChild?.type.name).toBe('heading');
    expect(firstEditor.state.doc.firstChild?.type.name).toBe('table');

    omniInput.focus();
    service.focusEditor();
    expect(secondEditor.hasFocus()).toBe(true);

    unmountSecond();
    unmountFirst();
    controller.abort();
    firstDomNode.remove();
    secondDomNode.remove();
    omniInput.remove();
  });
});
