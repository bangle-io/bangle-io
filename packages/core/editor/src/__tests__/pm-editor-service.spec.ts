// @vitest-environment happy-dom

import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
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

    unmountSecond();
    unmountFirst();
    controller.abort();
    firstDomNode.remove();
    secondDomNode.remove();
  });
});
