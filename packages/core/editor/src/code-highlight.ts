import {
  collection,
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  type PMNode,
} from '@bangle.io/prosemirror-plugins';
import { createHighlighter } from 'shiki';

const CODE_HIGHLIGHT_PLUGIN_KEY = new PluginKey('code-highlight');
const CODE_THEME = 'github-dark';
const COPY_LABEL = 'Copy';
const COPIED_LABEL = 'Copied';
const COPY_FEEDBACK_TIMEOUT_MS = 1200;
const SUPPORTED_LANGS = [
  'text',
  'plaintext',
  'bash',
  'shell',
  'sh',
  'zsh',
  'powershell',
  'javascript',
  'typescript',
  'json',
  'yaml',
  'python',
] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];
const DEFAULT_LANG: SupportedLang = 'text';

let highlighterPromise: ReturnType<typeof createHighlighter> | undefined;
let highlighterInstance:
  | Awaited<ReturnType<typeof createHighlighter>>
  | undefined;
type LoadedHighlighter = Awaited<ReturnType<typeof createHighlighter>>;
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

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [CODE_THEME],
      langs: [...SUPPORTED_LANGS],
    });
    void highlighterPromise.then((highlighter: LoadedHighlighter) => {
      highlighterInstance = highlighter;
    });
  }

  return highlighterPromise;
}

export function setupCodeHighlight() {
  return collection({
    id: 'code-highlight',
    plugin: {
      codeHighlight: new Plugin({
        key: CODE_HIGHLIGHT_PLUGIN_KEY,
        state: {
          init: (_, state) => createDecorations(state.doc),
          apply(tr, old) {
            if (!tr.docChanged && !tr.getMeta(CODE_HIGHLIGHT_PLUGIN_KEY)) {
              return old.map(tr.mapping, tr.doc);
            }
            return createDecorations(tr.doc);
          },
        },
        props: {
          decorations(state) {
            return CODE_HIGHLIGHT_PLUGIN_KEY.getState(state);
          },
        },
        view(view) {
          void getHighlighter()
            .then(() => {
              view.dispatch(
                view.state.tr.setMeta(CODE_HIGHLIGHT_PLUGIN_KEY, true),
              );
            })
            .catch(() => {
              // Fallback: plain code styling.
            });

          return {};
        },
      }),
    },
  });
}

function createDecorations(doc: PMNode): DecorationSet {
  const highlighter = highlighterInstance;
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'code_block') {
      return true;
    }

    const language = normalizeLanguage(node.attrs.language);
    const text = node.textContent || '';
    decorations.push(
      Decoration.widget(pos + 1, () => createCopyButtonWidget(text), {
        side: -1,
        ignoreSelection: true,
        stopEvent: (event) =>
          event.type === 'mousedown' ||
          event.type === 'pointerdown' ||
          event.type === 'touchstart' ||
          event.type === 'click',
      }),
    );

    if (!highlighter || !text) {
      return true;
    }

    const lines = text.split('\n');
    let charPos = pos + 1;
    let shikiLineIndex = 0;

    try {
      const rawTokens = highlighter.codeToTokens(text, {
        lang: language,
        theme: CODE_THEME,
      });
      const tokensByLine = Array.isArray(rawTokens)
        ? rawTokens
        : rawTokens.tokens;

      for (const line of lines) {
        const lineTokens = tokensByLine[shikiLineIndex] || [];
        let tokenPos = charPos;

        for (const token of lineTokens) {
          const tokenLength = token.content.length;
          if (!tokenLength) {
            continue;
          }

          const from = tokenPos;
          const to = tokenPos + tokenLength;
          const styleParts: string[] = [];

          if (token.color) {
            styleParts.push(`color:${token.color}`);
          }
          if (token.fontStyle & 1) {
            styleParts.push('font-style:italic');
          }
          if (token.fontStyle & 2) {
            styleParts.push('font-weight:600');
          }
          if (token.fontStyle & 4) {
            styleParts.push('text-decoration:underline');
          }

          if (from < to) {
            decorations.push(
              Decoration.inline(from, to, {
                class: 'prosemirror-code-token',
                style: styleParts.join(';'),
              }),
            );
          }

          tokenPos = to;
        }

        charPos += line.length + 1;
        shikiLineIndex += 1;
      }
    } catch {
      // Unsupported language or tokenization error.
    }

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function createCopyButtonWidget(text: string): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'prosemirror-code-copy-widget';
  wrapper.contentEditable = 'false';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prosemirror-code-copy-button';
  button.textContent = COPY_LABEL;
  button.setAttribute('aria-label', COPY_LABEL);
  button.setAttribute('title', COPY_LABEL);
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
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const copied = await copyTextToClipboard(text);
    if (!copied) {
      return;
    }
    button.textContent = COPIED_LABEL;
    globalThis.setTimeout(() => {
      button.textContent = COPY_LABEL;
    }, COPY_FEEDBACK_TIMEOUT_MS);
  });

  wrapper.append(button);
  return wrapper;
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
  if (!doc || !doc.body) {
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

function normalizeLanguage(language: unknown): SupportedLang {
  if (typeof language !== 'string' || !language.trim()) {
    return DEFAULT_LANG;
  }

  const normalized = language.trim().toLowerCase();
  if (normalized === 'ps1' || normalized === 'pwsh') {
    return 'powershell';
  }
  if (normalized === 'js') {
    return 'javascript';
  }
  if (normalized === 'ts') {
    return 'typescript';
  }
  if (normalized === 'yml') {
    return 'yaml';
  }
  if (normalized === 'console') {
    return 'bash';
  }

  if ((SUPPORTED_LANGS as readonly string[]).includes(normalized)) {
    return normalized as SupportedLang;
  }

  return DEFAULT_LANG;
}
