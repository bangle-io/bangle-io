import {
  collection,
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type PMNode,
} from '@bangle.io/prosemirror-plugins';
import { createHighlightPlugin, type Parser } from 'prosemirror-highlight';
import type { EditorView } from 'prosemirror-view';
import {
  DEFAULT_CODE_BLOCK_LANGUAGE,
  getRawCodeBlockLanguage,
  normalizeCodeBlockLanguage,
} from './code-highlight-languages';

const CODE_ACTIONS_PLUGIN_KEY = new PluginKey('code-actions');
const COPY_FEEDBACK_TIMEOUT_MS = 1200;
const copiedFeedbackUntilByPos = new Map<number, number>();

type ClipboardApi = {
  writeText: (text: string) => Promise<void>;
};
type CopyTextarea = {
  value: string;
  setAttribute: (name: string, value: string) => void;
  style: {
    position: string;
    left: string;
    top: string;
    opacity: string;
    pointerEvents: string;
  };
  focus: () => void;
  select: () => void;
  remove: () => void;
};
type CopyDocument = {
  createElement: (tagName: 'textarea') => CopyTextarea;
  body: {
    appendChild: (node: CopyTextarea) => void;
  } | null;
  execCommand?: (command: string) => boolean;
};
type MinimalEditorView = Pick<EditorView, 'state' | 'dispatch' | 'focus'>;
type CodeBlockPosResolver = () => number | undefined;
type CodeActionsState = {
  decorations: DecorationSet;
  signature: string;
};

let loadedHighlightParser: Parser | undefined;
let highlightParserPromise: Promise<void> | undefined;

export function setupCodeHighlight() {
  return collection({
    id: 'code-highlight',
    plugin: {
      codeHighlight: createHighlightPlugin({
        parser: lazyCodeHighlightParser,
        nodeTypes: ['code_block'],
        languageExtractor: (node) =>
          normalizeCodeBlockLanguage(node.attrs.language),
      }),
      codeBlockActions: new Plugin({
        key: CODE_ACTIONS_PLUGIN_KEY,
        state: {
          init: (_, state) => createActionState(state.doc),
          apply(tr, old: CodeActionsState) {
            const mappedDecorations = old.decorations.map(tr.mapping, tr.doc);
            if (!tr.docChanged && !tr.getMeta(CODE_ACTIONS_PLUGIN_KEY)) {
              return {
                ...old,
                decorations: mappedDecorations,
              };
            }

            const signature = createActionSignature(tr.doc);
            const expectedDecorationCount = countCodeActionDecorations(tr.doc);
            if (
              !tr.getMeta(CODE_ACTIONS_PLUGIN_KEY) &&
              signature === old.signature &&
              mappedDecorations.find().length === expectedDecorationCount
            ) {
              return {
                decorations: mappedDecorations,
                signature,
              };
            }
            return createActionState(tr.doc, signature);
          },
        },
        props: {
          decorations(state) {
            return CODE_ACTIONS_PLUGIN_KEY.getState(state)?.decorations;
          },
        },
      }),
    },
  });
}

const lazyCodeHighlightParser: Parser = (options) => {
  const language = normalizeCodeBlockLanguage(options.language);
  if (!options.content || language === 'text' || language === 'plaintext') {
    return [];
  }

  if (!loadedHighlightParser) {
    highlightParserPromise ??= import('./code-highlight-shiki')
      .then(({ createCodeHighlightParser }) => {
        const parser = createCodeHighlightParser();
        loadedHighlightParser = parser;
        const result = parser({
          ...options,
          language,
        });
        return Array.isArray(result) ? undefined : result;
      })
      .catch((error: unknown) => {
        highlightParserPromise = undefined;
        throw error;
      });
    return highlightParserPromise;
  }

  return loadedHighlightParser({
    ...options,
    language,
  });
};

function createActionState(
  doc: PMNode,
  signature = createActionSignature(doc),
): CodeActionsState {
  return {
    decorations: createActionDecorations(doc),
    signature,
  };
}

function createActionSignature(doc: PMNode): string {
  const languages: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'code_block') {
      languages.push(getRawCodeBlockLanguage(node.attrs.language));
      return false;
    }
    return true;
  });
  return languages.join('\0');
}

function countCodeActionDecorations(doc: PMNode): number {
  let codeBlockCount = 0;
  doc.descendants((node) => {
    if (node.type.name === 'code_block') {
      codeBlockCount += 1;
      return false;
    }
    return true;
  });
  return codeBlockCount * 2;
}

function createActionDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'code_block') {
      return true;
    }

    const rawLanguage = getRawCodeBlockLanguage(node.attrs.language);
    decorations.push(
      Decoration.widget(
        pos + 1,
        (view, getPos) =>
          createLanguageBadgeWidget(
            rawLanguage,
            codeBlockPosFromWidget(getPos),
            view,
          ),
        {
          key: `code-language:${pos}:${rawLanguage}`,
          side: -1,
          ignoreSelection: true,
          stopEvent: isCodeActionEvent,
        },
      ),
    );
    decorations.push(
      Decoration.widget(
        pos + 1,
        (view, getPos) =>
          createCopyButtonWidget(codeBlockPosFromWidget(getPos), view),
        {
          key: `code-copy:${pos}`,
          side: -1,
          ignoreSelection: true,
          stopEvent: isCodeActionEvent,
        },
      ),
    );

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function codeBlockPosFromWidget(getWidgetPos: CodeBlockPosResolver) {
  return () => {
    const widgetPos = getWidgetPos();
    return widgetPos === undefined ? undefined : widgetPos - 1;
  };
}

function isCodeActionEvent(event: Event): boolean {
  return (
    event.type === 'mousedown' ||
    event.type === 'pointerdown' ||
    event.type === 'touchstart' ||
    event.type === 'click'
  );
}

function createCopyButtonWidget(
  getCodeBlockPos: CodeBlockPosResolver,
  editorView: EditorView,
): HTMLElement {
  const copyLabel = t.app.editor.codeBlock.copy;
  const wrapper = document.createElement('span');
  wrapper.className = 'prosemirror-code-copy-widget';
  wrapper.contentEditable = 'false';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prosemirror-code-copy-button';
  button.setAttribute('aria-label', copyLabel);
  button.setAttribute('title', copyLabel);
  button.tabIndex = -1;
  updateCopyButtonText(button, getCodeBlockPos());
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('touchstart', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const codeBlockPos = getCodeBlockPos();
    if (codeBlockPos === undefined) {
      return;
    }

    const copied = await copyTextToClipboard(
      getCodeBlockText(editorView, codeBlockPos),
    );
    if (!copied) {
      return;
    }
    showCopyFeedback(button, codeBlockPos);
    editorView.focus();
  });

  wrapper.append(button);
  return wrapper;
}

function showCopyFeedback(button: HTMLButtonElement, codeBlockPos: number) {
  const until = Date.now() + COPY_FEEDBACK_TIMEOUT_MS;
  copiedFeedbackUntilByPos.set(codeBlockPos, until);
  button.textContent = t.app.editor.codeBlock.copied;
  scheduleCopyFeedbackReset(button, codeBlockPos, until);
}

function updateCopyButtonText(
  button: HTMLButtonElement,
  codeBlockPos: number | undefined,
) {
  if (codeBlockPos === undefined) {
    button.textContent = t.app.editor.codeBlock.copy;
    return;
  }

  const until = copiedFeedbackUntilByPos.get(codeBlockPos);
  if (!until || until <= Date.now()) {
    copiedFeedbackUntilByPos.delete(codeBlockPos);
    button.textContent = t.app.editor.codeBlock.copy;
    return;
  }

  button.textContent = t.app.editor.codeBlock.copied;
  scheduleCopyFeedbackReset(button, codeBlockPos, until);
}

function scheduleCopyFeedbackReset(
  button: HTMLButtonElement,
  codeBlockPos: number,
  until: number,
) {
  globalThis.setTimeout(
    () => {
      const activeUntil = copiedFeedbackUntilByPos.get(codeBlockPos);
      if (activeUntil !== undefined && activeUntil > until) {
        return;
      }
      copiedFeedbackUntilByPos.delete(codeBlockPos);
      button.textContent = t.app.editor.codeBlock.copy;
    },
    Math.max(0, until - Date.now()),
  );
}

function getCodeBlockText(
  editorView: EditorView,
  codeBlockPos: number | undefined,
): string {
  if (editorView.isDestroyed || codeBlockPos === undefined) {
    return '';
  }
  const node = editorView.state.doc.nodeAt(codeBlockPos);
  if (node?.type.name !== 'code_block') {
    return '';
  }
  return node.textContent || '';
}

function createLanguageBadgeWidget(
  language: string,
  getCodeBlockPos: CodeBlockPosResolver,
  editorView: EditorView,
): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'prosemirror-code-language-widget';
  wrapper.contentEditable = 'false';
  wrapper.append(
    createLanguageButton(wrapper, language, getCodeBlockPos, editorView),
  );

  return wrapper;
}

function createLanguageButton(
  container: HTMLElement,
  language: string,
  getCodeBlockPos: CodeBlockPosResolver,
  editorView: EditorView,
): HTMLButtonElement {
  const editLanguageLabel = t.app.editor.codeBlock.editLanguage;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prosemirror-code-language-button';
  button.textContent = (language || DEFAULT_CODE_BLOCK_LANGUAGE).toUpperCase();
  button.setAttribute('aria-label', editLanguageLabel);
  button.setAttribute('title', editLanguageLabel);
  button.tabIndex = -1;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('touchstart', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showLanguageEditor(container, editorView, getCodeBlockPos, language);
  });

  return button;
}

function showLanguageEditor(
  container: HTMLElement,
  editorView: EditorView,
  getCodeBlockPos: CodeBlockPosResolver,
  initialLanguage: string,
) {
  let finished = false;
  const input = document.createElement('input');
  const ownerDocument = input.ownerDocument;
  input.type = 'text';
  input.className = 'prosemirror-code-language-input';
  input.value = initialLanguage || '';
  input.placeholder = DEFAULT_CODE_BLOCK_LANGUAGE;
  input.setAttribute('aria-label', t.app.editor.codeBlock.editLanguage);

  const restoreButton = () => {
    container.replaceChildren(
      createLanguageButton(
        container,
        initialLanguage,
        getCodeBlockPos,
        editorView,
      ),
    );
  };
  const finish = () => {
    if (finished) {
      return false;
    }
    finished = true;
    ownerDocument.removeEventListener('pointerdown', handlePointerDown, true);
    return true;
  };
  const commit = () => {
    if (!finish()) {
      return;
    }
    const changed = applyLanguageChange(
      editorView,
      getCodeBlockPos(),
      input.value,
      initialLanguage,
    );
    if (!changed) {
      restoreButton();
    }
  };
  const cancel = () => {
    if (!finish()) {
      return;
    }
    restoreButton();
    editorView.focus();
  };
  const handlePointerDown = (event: PointerEvent) => {
    if (event.target instanceof Node && container.contains(event.target)) {
      return;
    }
    commit();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', () => {
    commit();
  });
  ownerDocument.addEventListener('pointerdown', handlePointerDown, true);

  container.replaceChildren(input);
  input.focus();
  input.select();
}

function applyLanguageChange(
  editorView: EditorView,
  codeBlockPos: number | undefined,
  value: string,
  previousValue: string,
): boolean {
  if (!editorView || editorView.isDestroyed || codeBlockPos === undefined) {
    return false;
  }

  const nextLanguage = value.trim().toLowerCase();
  if (nextLanguage === previousValue) {
    editorView.focus();
    return false;
  }

  const changed = setCodeBlockLanguage(editorView, codeBlockPos, nextLanguage);
  editorView.focus();
  return changed;
}

function setCodeBlockLanguage(
  editorView: MinimalEditorView,
  codeBlockPos: number,
  language: string,
): boolean {
  const node = editorView.state.doc.nodeAt(codeBlockPos);
  if (node?.type.name !== 'code_block') {
    return false;
  }
  if (node.attrs.language === language) {
    return false;
  }

  const nextAttrs = {
    ...node.attrs,
    language,
  };
  editorView.dispatch(
    editorView.state.tr
      .setNodeMarkup(codeBlockPos, undefined, nextAttrs)
      .setMeta(CODE_ACTIONS_PLUGIN_KEY, true),
  );
  return true;
}

export async function copyTextToClipboard(
  text: string,
  options?: {
    clipboard?: ClipboardApi;
    document?: CopyDocument;
  },
): Promise<boolean> {
  const clipboard =
    options?.clipboard ?? globalThis.navigator?.clipboard ?? undefined;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the document fallback.
    }
  }

  const doc = options?.document ?? getCopyDocument(globalThis.document);
  if (!doc?.body) {
    return false;
  }

  const textarea = doc.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  doc.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    if (typeof doc.execCommand !== 'function') {
      return false;
    }
    return doc.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function getCopyDocument(value: unknown): CopyDocument | undefined {
  if (!isCopyDocument(value)) {
    return undefined;
  }

  return value;
}

function isCopyDocument(value: unknown): value is CopyDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'createElement' in value &&
    'body' in value
  );
}
