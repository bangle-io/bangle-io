// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import { setupDragNode } from '../drag';
import { setupParagraph } from '../paragraph';
import { createBangerEditorTestSetup } from '../test-helpers';

const editorTest = createBangerEditorTestSetup({
  extensions: [
    setupBase(),
    setupParagraph(),
    setupCodeBlock(),
    setupDragNode({}),
  ],
});

const { doc, p } = editorTest.builders;

afterEach(() => {
  editorTest.cleanup();
});

function allHandles() {
  return [...document.querySelectorAll<HTMLElement>('[data-block-handle]')];
}

function hoverFirstParagraph(editor: { view: { dom: HTMLElement } }): void {
  const paragraph = editor.view.dom.querySelector('p');
  if (!paragraph) {
    throw new Error('Expected a paragraph in the test editor');
  }
  document.elementsFromPoint = () => [paragraph];
  editor.view.dom.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 10 }),
  );
}

describe('block handle with multiple editor views', () => {
  it('keeps a separate handle per view and only shows the hovered one', () => {
    const editorA = editorTest.createEditor(doc(p('alpha')));
    const editorB = editorTest.createEditor(doc(p('beta')));

    const handles = allHandles();
    expect(handles).toHaveLength(2);
    expect(handles[0]).not.toBe(handles[1]);
    expect(handles.every((el) => el.classList.contains('hidden'))).toBe(true);

    hoverFirstParagraph(editorA);

    const visible = allHandles().filter(
      (el) => !el.classList.contains('hidden'),
    );
    expect(visible).toHaveLength(1);

    // Hovering editor B shows its own handle without touching A's.
    hoverFirstParagraph(editorB);
    expect(
      allHandles().filter((el) => !el.classList.contains('hidden')),
    ).toHaveLength(2);
  });

  it('unmounting one view leaves the surviving view fully functional', () => {
    const editorA = editorTest.createEditor(doc(p('alpha')));
    const editorB = editorTest.createEditor(doc(p('beta')));
    expect(allHandles()).toHaveLength(2);

    hoverFirstParagraph(editorA);

    editorB.view.destroy();

    const remaining = allHandles();
    expect(remaining).toHaveLength(1);
    const handleA = remaining[0];
    if (!handleA) {
      throw new Error('Expected editor A to keep its handle');
    }
    // B's teardown must not clear A's visible handle or hover state.
    expect(handleA.classList.contains('hidden')).toBe(false);

    // A's own events still control its handle after B is gone.
    editorA.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
    );
    expect(handleA.classList.contains('hidden')).toBe(true);

    hoverFirstParagraph(editorA);
    expect(handleA.classList.contains('hidden')).toBe(false);
  });
});
