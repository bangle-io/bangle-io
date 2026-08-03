// @vitest-environment jsdom

import {
  EditorState,
  EditorView,
  type PMNode,
  resolve,
  Schema,
  setupBase,
  setupCodeBlock,
  setupParagraph,
} from '@bangle.io/prosemirror-plugins';
import type { Parser, ParserOptions } from 'prosemirror-highlight';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createBlockActionButton,
  isBlockActionEvent,
} from '../block-action-button';
import { copyTextToClipboard, setupCodeHighlight } from '../code-highlight';
import { normalizeCodeBlockLanguage } from '../code-highlight-languages';
import { createCodeHighlightParser } from '../code-highlight-shiki';

const codeActionEditors: Array<{ mount: HTMLElement; view: EditorView }> = [];

beforeEach(() => {
  vi.stubGlobal('t', {
    app: {
      editor: {
        codeBlock: {
          copy: 'Copy',
          copied: 'Copied',
          delete: 'Delete',
          deleteLabel: 'Delete code block',
          editLanguage: 'Edit language',
        },
      },
    },
  });
});

afterEach(() => {
  for (const { mount, view } of codeActionEditors.splice(0)) {
    if (!view.isDestroyed) {
      view.destroy();
    }
    mount.remove();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('block action buttons', () => {
  test('activate with Enter and Space without editor leakage or synthetic double activation', async () => {
    const activate = vi.fn();
    const button = createBlockActionButton({
      className: 'action',
      label: 'Delete frontmatter',
      onClick: activate,
      text: 'Delete',
    });
    const chromeHost = document.createElement('span');
    const leakedKeyboardEvent = vi.fn();
    chromeHost.addEventListener('keydown', leakedKeyboardEvent);
    chromeHost.addEventListener('keyup', leakedKeyboardEvent);
    chromeHost.append(button);
    document.body.append(chromeHost);

    button.focus();
    expect(button.tabIndex).toBe(0);
    expect(document.activeElement).toBe(button);

    for (const key of ['Enter', ' '] as const) {
      const keydown = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
      });
      button.dispatchEvent(keydown);
      expect(keydown.defaultPrevented).toBe(true);
      expect(isBlockActionEvent(keydown)).toBe(true);
      expect(leakedKeyboardEvent).not.toHaveBeenCalled();
      if (key === ' ') {
        const keyup = new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key,
        });
        button.dispatchEvent(keyup);
        expect(keyup.defaultPrevented).toBe(true);
        expect(isBlockActionEvent(keyup)).toBe(true);
        expect(leakedKeyboardEvent).not.toHaveBeenCalled();
      }
      // Model a browser that still emits a keyboard click from an editable
      // widget host after the prevented key event.
      const syntheticClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        detail: 0,
      });
      button.dispatchEvent(syntheticClick);
      expect(syntheticClick.defaultPrevented).toBe(true);
    }

    expect(activate).toHaveBeenCalledTimes(2);

    // A cancelled key may produce no synthetic click. Its guard must not
    // swallow a later independent activation with the same detail value.
    const unpairedEnter = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    button.dispatchEvent(unpairedEnter);
    await Promise.resolve();
    button.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        detail: 0,
      }),
    );
    expect(activate).toHaveBeenCalledTimes(4);
  });
});

function createFakeTextArea() {
  return {
    value: '',
    setAttribute: vi.fn(),
    style: {
      position: '',
      left: '',
      top: '',
      opacity: '',
      pointerEvents: '',
    },
    focus: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
  };
}

describe('copyTextToClipboard', () => {
  test('uses clipboard api when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createElement = vi.fn(() => createFakeTextArea());

    const result = await copyTextToClipboard('console.log(1);', {
      clipboard: { writeText: writeText },
      document: {
        createElement: createElement,
        body: {
          appendChild: vi.fn(),
        },
        execCommand: vi.fn(() => true),
      },
    });

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('console.log(1);');
    expect(createElement).not.toHaveBeenCalled();
  });

  test('falls back to document copy command when clipboard fails', async () => {
    const textarea = createFakeTextArea();
    const appendChild = vi.fn();
    const execCommand = vi.fn(() => true);

    const result = await copyTextToClipboard('line 1\nline 2', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('blocked')),
      },
      document: {
        createElement: vi.fn(() => textarea),
        body: { appendChild: appendChild },
        execCommand: execCommand,
      },
    });

    expect(result).toBe(true);
    expect(textarea.value).toBe('line 1\nline 2');
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(textarea.remove).toHaveBeenCalled();
  });

  test('returns false when fallback cannot execute copy command', async () => {
    const result = await copyTextToClipboard('x', {
      document: {
        createElement: vi.fn(() => createFakeTextArea()),
        body: { appendChild: vi.fn() },
      },
    });

    expect(result).toBe(false);
  });
});

describe('normalizeCodeBlockLanguage', () => {
  test.each([
    ['js', 'javascript'],
    ['TS', 'typescript'],
    ['pwsh', 'powershell'],
    ['console', 'bash'],
    ['unknown-lang', 'text'],
    ['', 'text'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeCodeBlockLanguage(input)).toBe(expected);
  });
});

describe('createCodeHighlightParser', () => {
  test('loads Shiki lazily for supported languages', async () => {
    const parser = createCodeHighlightParser();
    const decorations = await parseWhenReady(parser, {
      content: 'const answer = 42;',
      language: 'js',
      pos: 0,
      size: 20,
    });

    expect(decorations.length).toBeGreaterThan(0);
  });

  test('skips plaintext languages', () => {
    const parser = createCodeHighlightParser();

    expect(
      parser({
        content: 'plain text',
        language: 'text',
        pos: 0,
        size: 12,
      }),
    ).toEqual([]);
  });

  test('rejects Shiki load failures so the highlighter plugin does not spin', async () => {
    vi.resetModules();
    vi.doMock('shiki/core', () => ({
      createHighlighterCore: () => {
        throw new Error('offline');
      },
    }));

    try {
      const { createCodeHighlightParser } = await import(
        '../code-highlight-shiki'
      );
      const parser = createCodeHighlightParser();

      await expect(
        parser({
          content: 'const answer = 42;',
          language: 'js',
          pos: 0,
          size: 20,
        }),
      ).rejects.toThrow('offline');
    } finally {
      vi.doUnmock('shiki/core');
      vi.resetModules();
    }
  });
});

describe('setupCodeHighlight', () => {
  test('renders accessible, editor-chrome action wrappers for each code block', () => {
    const { mount } = createCodeActionEditor([
      { language: 'js', text: 'const first = true;' },
      { language: 'ts', text: 'const second: boolean = false;' },
    ]);

    const languageWidgets = getElements<HTMLElement>(
      mount,
      '.prosemirror-code-language-widget',
    );
    const copyWidgets = getElements<HTMLElement>(
      mount,
      '.prosemirror-code-copy-widget',
    );
    expect(languageWidgets).toHaveLength(2);
    expect(copyWidgets).toHaveLength(2);
    for (const widget of [...languageWidgets, ...copyWidgets]) {
      expect(widget.dataset.editorChrome).toBe('true');
      expect(widget.contentEditable).toBe('false');
    }
    expect(
      getElements<HTMLButtonElement>(
        mount,
        '.prosemirror-code-language-button',
      ).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Edit language', 'Edit language']);
    expect(
      getElements<HTMLButtonElement>(
        mount,
        '.prosemirror-code-copy-button',
      ).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Copy', 'Copy']);
    expect(
      getElements<HTMLButtonElement>(
        mount,
        '.prosemirror-block-delete-button',
      ).map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Delete code block', 'Delete code block']);
    expect(
      getElements<HTMLButtonElement>(mount, 'button').map(
        (button) => button.tabIndex,
      ),
    ).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test('cancels and blurs an empty language editor without inventing language info', () => {
    const { mount, view } = createCodeActionEditor([
      { language: '', text: 'plain()' },
    ]);
    const languageButton = getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-code-language-button',
    );

    languageButton.click();
    const escapeInput = getRequiredElement<HTMLInputElement>(
      mount,
      '.prosemirror-code-language-input',
    );
    escapeInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Escape',
      }),
    );
    expect(findNodes(view.state.doc, 'code_block')[0]?.attrs.language).toBe('');
    expect(languageButton.textContent).toBe('TEXT');
    expect(document.activeElement).toBe(view.dom);

    languageButton.click();
    getRequiredElement<HTMLInputElement>(
      mount,
      '.prosemirror-code-language-input',
    ).blur();
    expect(findNodes(view.state.doc, 'code_block')[0]?.attrs.language).toBe('');
    expect(languageButton.textContent).toBe('TEXT');
    expect(document.activeElement).toBe(view.dom);
  });

  test('commits trimmed, lowercase language changes and retains editor focus', () => {
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const answer = 42;' },
    ]);
    getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-code-language-button',
    ).click();
    const input = getRequiredElement<HTMLInputElement>(
      mount,
      '.prosemirror-code-language-input',
    );
    input.value = '  TypeScript  ';
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(findNodes(view.state.doc, 'code_block')[0]?.attrs.language).toBe(
      'typescript',
    );
    expect(document.activeElement).toBe(view.dom);
  });

  test('copies and deletes only the targeted block, with feedback and focus restoration', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const keep = true;' },
      { language: 'ts', text: 'const remove = false;' },
    ]);
    const copyButtons = getElements<HTMLButtonElement>(
      mount,
      '.prosemirror-code-copy-button',
    );
    expect(copyButtons).toHaveLength(2);
    copyButtons[0]?.click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const keep = true;');
      expect(copyButtons[0]?.textContent).toBe('Copied');
    });
    expect(copyButtons[0]?.getAttribute('aria-label')).toBe('Copied');
    expect(copyButtons[0]?.getAttribute('aria-live')).toBe('polite');
    expect(copyButtons[1]?.textContent).toBe('Copy');
    expect(document.activeElement).toBe(view.dom);

    const deleteButtons = getElements<HTMLButtonElement>(
      mount,
      '.prosemirror-block-delete-button',
    );
    expect(deleteButtons).toHaveLength(2);
    deleteButtons[1]?.click();
    expect(findNodes(view.state.doc, 'code_block')).toHaveLength(1);
    expect(findNodes(view.state.doc, 'code_block')[0]?.textContent).toBe(
      'const keep = true;',
    );
    expect(document.activeElement).toBe(view.dom);
  });

  test('restores editor focus when clipboard and document fallback both fail', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const execCommandDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'execCommand',
    );
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    const externalControl = document.createElement('button');
    document.body.append(externalControl);
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const blocked = true;' },
    ]);
    const copyButton = getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-code-copy-button',
    );

    try {
      externalControl.focus();
      expect(document.activeElement).toBe(externalControl);
      copyButton.click();

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('const blocked = true;');
        expect(execCommand).toHaveBeenCalledWith('copy');
      });
      expect(copyButton.textContent).toBe('Copy');
      expect(document.activeElement).toBe(view.dom);
    } finally {
      if (execCommandDescriptor) {
        Object.defineProperty(document, 'execCommand', execCommandDescriptor);
      } else {
        Reflect.deleteProperty(document, 'execCommand');
      }
    }
  });

  test('keeps copy feedback scoped to the owning editor at matching positions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const first = createCodeActionEditor([
      { language: 'js', text: 'const first = true;' },
    ]);
    getRequiredElement<HTMLButtonElement>(
      first.mount,
      '.prosemirror-code-copy-button',
    ).click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const first = true;');
    });

    const second = createCodeActionEditor([
      { language: 'js', text: 'const second = true;' },
    ]);
    expect(
      getRequiredElement<HTMLButtonElement>(
        second.mount,
        '.prosemirror-code-copy-button',
      ).textContent,
    ).toBe('Copy');
  });

  test('commits language edits to a code block after its widget position is remapped', () => {
    const extensions = [
      setupBase(),
      setupParagraph(),
      setupCodeBlock({ keyToCodeBlock: false }),
      setupCodeHighlight(),
    ];
    const resolved = resolve(extensions);
    const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new EditorView(
      { mount },
      {
        state: EditorState.create({
          doc: schema.node('doc', null, [
            schema.node('paragraph', null, schema.text('before')),
            schema.node(
              'code_block',
              { language: 'js' },
              schema.text('console.log("hi");'),
            ),
          ]),
          schema,
          plugins: resolved.resolvePlugins({ schema }),
        }),
      },
    );

    try {
      const languageButton = getRequiredElement<HTMLButtonElement>(
        mount,
        '.prosemirror-code-language-button',
      );
      languageButton.click();

      view.dispatch(
        view.state.tr.insert(
          0,
          schema.node('paragraph', null, schema.text('inserted')),
        ),
      );

      const input = getRequiredElement<HTMLInputElement>(
        mount,
        '.prosemirror-code-language-input',
      );
      input.value = 'ts';
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );

      const [codeBlock] = findNodes(view.state.doc, 'code_block');
      expect(codeBlock?.attrs.language).toBe('ts');
    } finally {
      view.destroy();
      mount.remove();
    }
  });

  test('copies a code block after its copy widget position is remapped', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const remapped = true;' },
    ]);
    const copyButton = getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-code-copy-button',
    );

    view.dispatch(
      view.state.tr.insert(
        0,
        view.state.schema.node(
          'paragraph',
          null,
          view.state.schema.text('inserted'),
        ),
      ),
    );
    copyButton.click();

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const remapped = true;');
    });
  });

  test('does not delete a replacement paragraph from a stale code action widget', () => {
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const stale = true;' },
    ]);
    const deleteButton = getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-block-delete-button',
    );
    const paragraph = view.state.schema.nodes.paragraph;
    if (!paragraph) {
      throw new Error('Expected paragraph node type');
    }

    view.dispatch(view.state.tr.setNodeMarkup(0, paragraph));
    deleteButton.click();

    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(view.state.doc.textContent).toBe('const stale = true;');
  });

  test('removes an active language editor listener when its block changes or view is destroyed', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { mount, view } = createCodeActionEditor([
      { language: 'js', text: 'const removed = true;' },
      { language: 'ts', text: 'const retained = true;' },
    ]);
    const firstLanguageButton = getElements<HTMLButtonElement>(
      mount,
      '.prosemirror-code-language-button',
    )[0];
    if (!firstLanguageButton) {
      throw new Error('Expected first language button');
    }

    firstLanguageButton.click();
    const firstPointerDownListener = addEventListener.mock.calls
      .filter(([type]) => type === 'pointerdown')
      .at(-1)?.[1];
    if (typeof firstPointerDownListener !== 'function') {
      throw new Error('Expected the first language editor pointer listener');
    }
    getRequiredElement<HTMLInputElement>(
      mount,
      '.prosemirror-code-language-input',
    ).value = 'stale';
    const firstBlock = view.state.doc.firstChild;
    if (!firstBlock) {
      throw new Error('Expected first code block');
    }
    view.dispatch(view.state.tr.delete(0, firstBlock.nodeSize));
    expect(removeEventListener).toHaveBeenCalledWith(
      'pointerdown',
      firstPointerDownListener,
      true,
    );
    removeEventListener.mockClear();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(removeEventListener).not.toHaveBeenCalled();
    expect(findNodes(view.state.doc, 'code_block')[0]?.attrs.language).toBe(
      'ts',
    );

    getRequiredElement<HTMLButtonElement>(
      mount,
      '.prosemirror-code-language-button',
    ).click();
    const secondPointerDownListener = addEventListener.mock.calls
      .filter(([type]) => type === 'pointerdown')
      .at(-1)?.[1];
    if (typeof secondPointerDownListener !== 'function') {
      throw new Error('Expected the second language editor pointer listener');
    }
    removeEventListener.mockClear();
    view.destroy();
    expect(removeEventListener).toHaveBeenCalledWith(
      'pointerdown',
      secondPointerDownListener,
      true,
    );
    removeEventListener.mockClear();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(removeEventListener).not.toHaveBeenCalled();
  });
});

function createCodeActionEditor(
  blocks: Array<{ language: string; text: string }>,
) {
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupCodeBlock({ keyToCodeBlock: false }),
    setupCodeHighlight(),
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  const mount = document.createElement('div');
  document.body.append(mount);
  const view = new EditorView(
    { mount },
    {
      state: EditorState.create({
        doc: schema.node(
          'doc',
          null,
          blocks.map(({ language, text }) =>
            schema.node(
              'code_block',
              { language },
              text ? schema.text(text) : undefined,
            ),
          ),
        ),
        schema,
        plugins: resolved.resolvePlugins({ schema }),
      }),
    },
  );
  Object.defineProperty(view, 'scrollToSelection', {
    configurable: true,
    value: () => undefined,
  });
  codeActionEditors.push({ mount, view });
  return { mount, view };
}

async function parseWhenReady(parser: Parser, options: ParserOptions) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = parser(options);
    if (Array.isArray(result)) {
      return result;
    }
    await result;
  }

  throw new Error('Highlight parser did not produce decorations');
}

function getRequiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Unable to find ${selector}`);
  }
  return element as T;
}

function getElements<T extends Element>(
  root: ParentNode,
  selector: string,
): T[] {
  return [...root.querySelectorAll(selector)].map((element) => element as T);
}

function findNodes(document: PMNode, typeName: string): PMNode[] {
  const nodes: PMNode[] = [];
  document.descendants((node) => {
    if (node.type.name === typeName) {
      nodes.push(node);
    }
    return true;
  });
  return nodes;
}
