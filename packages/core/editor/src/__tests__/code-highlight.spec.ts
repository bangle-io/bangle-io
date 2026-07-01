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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { copyTextToClipboard, setupCodeHighlight } from '../code-highlight';
import { normalizeCodeBlockLanguage } from '../code-highlight-languages';
import { createCodeHighlightParser } from '../code-highlight-shiki';

afterEach(() => {
  vi.unstubAllGlobals();
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
  test('commits language edits to a code block after its widget position is remapped', () => {
    vi.stubGlobal('t', {
      app: {
        editor: {
          codeBlock: {
            copy: 'Copy',
            copied: 'Copied',
            editLanguage: 'Edit language',
          },
        },
      },
    });

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
});

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
