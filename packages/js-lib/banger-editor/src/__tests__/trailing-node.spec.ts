// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupHeading } from '../heading';
import { setupParagraph } from '../paragraph';
import { createBangerEditorTestSetup } from '../test-helpers';
import { setupTrailingNode } from '../trailing-node';

const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupHeading(),
    setupTrailingNode(),
  ],
  builderAliases: {
    codeBlock: { nodeType: 'code_block', language: '' },
    doc: { nodeType: 'doc' },
    heading: { nodeType: 'heading', level: 1 },
    p: { nodeType: 'paragraph' },
  },
});

const { codeBlock, doc, p } = editorTest.builders;
const heading = editorTest.nodeBuilder('heading');

afterEach(() => {
  editorTest.cleanup();
});

describe('trailing node', () => {
  it('adds a paragraph when the user clicks below a final code block', () => {
    const editor = editorTest.createEditor(
      doc(codeBlock('const done = true;')),
    );

    mockEditorBounds(editor.view.dom, {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    });
    mockEditorBounds(editor.view.dom.lastElementChild, {
      bottom: 100,
      left: 0,
      right: 500,
      top: 20,
    });

    const event = dispatchMouseDown(editor.view.dom, { clientY: 160 });

    expect(event.defaultPrevented).toBe(true);
    editor.expectDoc(doc(codeBlock('const done = true;'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('adds a paragraph when the user clicks below a final heading', () => {
    const editor = editorTest.createEditor(doc(heading('Done')));

    mockEditorBounds(editor.view.dom, {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    });
    mockEditorBounds(editor.view.dom.lastElementChild, {
      bottom: 100,
      left: 0,
      right: 500,
      top: 20,
    });

    const event = dispatchMouseDown(editor.view.dom, { clientY: 160 });

    expect(event.defaultPrevented).toBe(true);
    editor.expectDoc(doc(heading('Done'), p()));
    expect(editor.selectionParentType()).toBe('paragraph');
  });

  it('does not add duplicate paragraphs or handle clicks inside the final node', () => {
    const paragraphEditor = editorTest.createEditor(
      doc(codeBlock('done'), p()),
    );
    mockEditorBounds(paragraphEditor.view.dom, {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    });
    mockEditorBounds(paragraphEditor.view.dom.lastElementChild, {
      bottom: 100,
      left: 0,
      right: 500,
      top: 20,
    });

    const paragraphEvent = dispatchMouseDown(paragraphEditor.view.dom, {
      clientY: 160,
    });

    expect(paragraphEvent.defaultPrevented).toBe(false);
    paragraphEditor.expectDoc(doc(codeBlock('done'), p()));

    const codeBlockEditor = editorTest.createEditor(doc(codeBlock('done')));
    mockEditorBounds(codeBlockEditor.view.dom, {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    });
    mockEditorBounds(codeBlockEditor.view.dom.lastElementChild, {
      bottom: 200,
      left: 0,
      right: 500,
      top: 20,
    });

    const insideEvent = dispatchMouseDown(codeBlockEditor.view.dom, {
      clientY: 100,
    });

    expect(insideEvent.defaultPrevented).toBe(false);
    codeBlockEditor.expectDoc(doc(codeBlock('done')));
  });

  it('does not add a paragraph for modified clicks below the final node', () => {
    const editor = editorTest.createEditor(doc(codeBlock('done')));

    mockEditorBounds(editor.view.dom, {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    });
    mockEditorBounds(editor.view.dom.lastElementChild, {
      bottom: 100,
      left: 0,
      right: 500,
      top: 20,
    });

    for (const modifier of ['shiftKey', 'metaKey'] as const) {
      const event = dispatchMouseDown(editor.view.dom, {
        clientY: 160,
        [modifier]: true,
      });

      expect(event.defaultPrevented).toBe(false);
      editor.expectDoc(doc(codeBlock('done')));
    }
  });
});

function dispatchMouseDown(target: HTMLElement, init: MouseEventInit) {
  document.elementFromPoint = () => target;

  const event = new MouseEvent('mousedown', {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 250,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function mockEditorBounds(
  element: Element | null,
  bounds: Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>,
) {
  if (!element) {
    throw new Error('Expected element to exist');
  }

  element.getBoundingClientRect = () =>
    ({
      ...bounds,
      height: bounds.bottom - bounds.top,
      toJSON: () => ({}),
      width: bounds.right - bounds.left,
      x: bounds.left,
      y: bounds.top,
    }) as DOMRect;
}
