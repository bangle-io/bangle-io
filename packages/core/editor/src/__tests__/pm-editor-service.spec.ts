// @vitest-environment happy-dom

import { createAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { TextSelection } from '@bangle.io/prosemirror-plugins';
import { createTestEnvironment, waitForExpect } from '@bangle.io/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { PmEditorService } from '../pm-editor-service';

const TEST_WS_NAME = 'test-ws';

describe('PmEditorService', () => {
  test('openWikiLink resolves closest notes and keeps missing-target writes safe', async () => {
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
      `${TEST_WS_NAME}:projects/Plan.md`,
      'Plan',
    );
    await services.fileSystem.createTextFile(`${TEST_WS_NAME}:todo.md`, 'root');
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:projects/todo.md`,
      'project',
    );
    services.navigation.goWorkspace(TEST_WS_NAME);
    await vi.waitFor(() => {
      expect(
        testEnv.store
          .get(services.workspaceState.$noteWsPaths)
          .map((path) => path.wsPath),
      ).toEqual(
        expect.arrayContaining([
          `${TEST_WS_NAME}:projects/Plan.md`,
          `${TEST_WS_NAME}:todo.md`,
          `${TEST_WS_NAME}:projects/todo.md`,
        ]),
      );
    });

    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;
    const domNode = document.createElement('div');
    document.body.append(domNode);
    const unmount = service.mountEditor({
      domNode,
      wsPath: `${TEST_WS_NAME}:projects/Plan.md`,
      name: 'wiki-editor',
    });
    await waitForExpect(() => {
      expect(service.getEditor('wiki-editor')).toBeDefined();
    });
    const view = service.getEditor('wiki-editor');
    if (!view) throw new Error('Expected wiki editor');

    const navigate = vi.spyOn(services.navigation, 'goWsPath');
    const createFile = vi.spyOn(services.fileSystem, 'createFile');
    await service.openWikiLink(view, 'todo');
    expect(navigate).toHaveBeenLastCalledWith(
      `${TEST_WS_NAME}:projects/todo.md`,
    );

    navigate.mockClear();
    await service.openWikiLink(view, 'new note');
    expect(createFile).toHaveBeenLastCalledWith(
      `${TEST_WS_NAME}:new note.md`,
      expect.any(File),
    );
    expect(navigate).toHaveBeenLastCalledWith(`${TEST_WS_NAME}:new note.md`);
    await expect(
      services.fileSystem.readFileAsText(`${TEST_WS_NAME}:new note.md`),
    ).resolves.toBe('');

    const writesBeforeUnsafeTarget = createFile.mock.calls.length;
    await service.openWikiLink(view, '../../escape');
    await service.openWikiLink(view, 'heading#fragment');
    expect(createFile).toHaveBeenCalledTimes(writesBeforeUnsafeTarget);

    navigate.mockClear();
    createFile.mockRejectedValueOnce(
      createAppError(
        'error::file:already-existing',
        'Race winner created note',
        {
          wsPath: `${TEST_WS_NAME}:race.md`,
        },
      ),
    );
    await service.openWikiLink(view, 'race');
    expect(navigate).toHaveBeenCalledWith(`${TEST_WS_NAME}:race.md`);

    navigate.mockClear();
    createFile.mockRejectedValueOnce(new Error('storage unavailable'));
    await service.openWikiLink(view, 'failed-note');
    expect(navigate).not.toHaveBeenCalled();
    expect(testEnv.commonOpts.emitAppError).toHaveBeenCalled();

    unmount();
    controller.abort();
    domNode.remove();
  });

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

  test('scopes collapsible-heading actions to the active or last active editor', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    if (!(services.editorEngine instanceof PmEditorService)) {
      throw new Error('Expected the ProseMirror editor engine');
    }
    const service = services.editorEngine;
    expect(service.toggleHeadingCollapse()).toBe(false);
    expect(service.collapseAllHeadings(1)).toBe(false);
    expect(service.uncollapseAllHeadings()).toBe(false);

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:first.md`,
      '# First\n\nfirst body',
    );
    await services.fileSystem.createTextFile(
      `${TEST_WS_NAME}:second.md`,
      '# Second\n\nsecond body',
    );

    const firstDomNode = document.createElement('div');
    const secondDomNode = document.createElement('div');
    const externalSurface = document.createElement('button');
    document.body.append(firstDomNode, secondDomNode, externalSurface);
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
      throw new Error('Expected both editors to be ready');
    }

    firstEditor.focus();
    expect(service.collapseAllHeadings(1)).toBe(true);
    expect(
      firstDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(1);
    expect(
      secondDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(0);

    secondEditor.focus();
    expect(service.collapseAllHeadings(1)).toBe(true);
    expect(
      secondDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(1);
    externalSurface.focus();

    // Once focus moves to omni-search/dialog UI, expand only the editor that
    // last owned focus; never fall back to mount order or another editor.
    expect(service.uncollapseAllHeadings()).toBe(true);
    expect(
      firstDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(1);
    expect(
      secondDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(0);

    firstEditor.focus();
    firstEditor.dispatch(
      firstEditor.state.tr.setSelection(
        TextSelection.create(firstEditor.state.doc, 1),
      ),
    );
    expect(service.toggleHeadingCollapse()).toBe(true);
    expect(
      firstDomNode.querySelectorAll('.B-collapsible-heading-hidden'),
    ).toHaveLength(0);

    unmountSecond();
    unmountFirst();
    controller.abort();
    firstDomNode.remove();
    secondDomNode.remove();
    externalSurface.remove();
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
