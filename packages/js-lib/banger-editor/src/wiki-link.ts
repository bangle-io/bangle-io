import type MarkdownIt from 'markdown-it';
import { collection } from './common';
import type {
  Command,
  DOMOutputSpec,
  EditorState,
  EditorView,
  NodeSpec,
  PMNode,
} from './pm';
import {
  Decoration,
  DecorationSet,
  InputRule,
  inputRules,
  Plugin,
  PluginKey,
  TextSelection,
} from './pm';

export type WikiLinkAttrs = {
  target: string;
  label: string | null;
};

const INVALID_WIKI_LINK_TARGET_CHARS = /[[\]\n|]/;
const INVALID_WIKI_LINK_LABEL_CHARS = /[[\]\n]/;

export type WikiLinkConfig = {
  name?: string;
  onActivate?: (view: EditorView, attrs: WikiLinkAttrs) => void;
  resolveTarget?: (attrs: WikiLinkAttrs, state: EditorState) => boolean;
};

export function parseWikiLinkContent(content: string): WikiLinkAttrs | null {
  const separator = content.indexOf('|');
  const target = separator < 0 ? content : content.slice(0, separator);
  const label = separator < 0 ? null : content.slice(separator + 1);
  if (
    !target ||
    INVALID_WIKI_LINK_TARGET_CHARS.test(target) ||
    (label !== null && INVALID_WIKI_LINK_LABEL_CHARS.test(label))
  ) {
    return null;
  }
  return { target, label };
}

export function serializeWikiLinkAttrs(attrs: WikiLinkAttrs): string | null {
  return parseWikiLinkContent(
    `${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}`,
  )
    ? `[[${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}]]`
    : null;
}

function displayText(attrs: WikiLinkAttrs): string {
  if (attrs.label !== null) {
    return attrs.label;
  }
  const finalSegment = attrs.target.split('/').filter(Boolean).at(-1);
  return (finalSegment ?? attrs.target).replace(/\.(?:md|markdown)$/i, '');
}

function attrsFromDomTarget(target: EventTarget | null): WikiLinkAttrs | null {
  const element =
    target instanceof HTMLElement
      ? target.closest<HTMLElement>('span[data-wiki-link]')
      : null;
  const wikiTarget = element?.dataset.wikiLink;
  if (!wikiTarget) {
    return null;
  }
  const attrs = {
    target: wikiTarget,
    label: element.dataset.wikiLabel ?? null,
  };
  return serializeWikiLinkAttrs(attrs) ? attrs : null;
}

function wikiLinkTokenizer(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'wiki_link', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '[[') {
      return false;
    }
    const prefix = state.src.slice(0, start);
    if (prefix.lastIndexOf('[[') > prefix.lastIndexOf(']]')) {
      return false;
    }
    const end = state.src.indexOf(']]', start + 2);
    if (end < 0) {
      return false;
    }
    const content = state.src.slice(start + 2, end);
    if (content.includes('[[')) {
      return false;
    }
    const attrs = parseWikiLinkContent(content);
    if (!attrs) {
      return false;
    }

    if (!silent) {
      const token = state.push('wiki_link', '', 0);
      token.meta = attrs;
    }
    state.pos = end + 2;
    return true;
  });
}

function getAttrsFromDom(dom: HTMLElement): WikiLinkAttrs | false {
  const target = dom.dataset.wikiLink;
  if (!target) {
    return false;
  }
  const attrs = { target, label: dom.dataset.wikiLabel ?? null };
  return serializeWikiLinkAttrs(attrs) ? attrs : false;
}

function createWikiLinkNode(
  state: EditorState,
  name: string,
  attrs: WikiLinkAttrs,
) {
  if (!serializeWikiLinkAttrs(attrs)) {
    return undefined;
  }
  return state.schema.nodes[name]?.create(attrs);
}

function parseMatchedWikiLink(match: RegExpMatchArray): WikiLinkAttrs | null {
  const source = match[0];
  return source.startsWith('[[') && source.endsWith(']]')
    ? parseWikiLinkContent(source.slice(2, -2))
    : null;
}

function wikiLinkText(attrs: WikiLinkAttrs): string {
  const serialized = serializeWikiLinkAttrs(attrs);
  if (serialized) {
    return serialized;
  }
  return attrs.label ?? attrs.target;
}

export function setupWikiLink(userConfig: WikiLinkConfig = {}) {
  const name = userConfig.name ?? 'wiki_link';
  const nodes = {
    [name]: {
      inline: true,
      group: 'inline',
      atom: true,
      selectable: true,
      attrs: { target: {}, label: { default: null } },
      parseDOM: [
        {
          tag: 'span[data-wiki-link]',
          getAttrs: (dom) =>
            dom instanceof HTMLElement ? getAttrsFromDom(dom) : false,
        },
      ],
      toDOM: (node: PMNode): DOMOutputSpec => {
        const attrs = node.attrs as WikiLinkAttrs;
        return [
          'span',
          {
            'data-wiki-link': attrs.target,
            ...(attrs.label === null ? {} : { 'data-wiki-label': attrs.label }),
            class: 'wiki-link rounded bg-muted px-1 text-primary',
            contenteditable: 'false',
            role: 'link',
            tabindex: '0',
          },
          displayText(attrs),
        ];
      },
      leafText: (node: PMNode) => {
        const attrs = node.attrs as WikiLinkAttrs;
        return wikiLinkText(attrs);
      },
    } satisfies NodeSpec,
  };

  return collection({
    id: `wiki-link-${name}`,
    nodes,
    plugin: {
      inputRules: inputRules({
        rules: [
          new InputRule(
            /\[\[([^[\]\n|]+)(?:\|([^[\]\n]*))?\]\]$/,
            (state, match, start, end) => {
              const attrs = parseMatchedWikiLink(match);
              if (
                !attrs ||
                state.selection.$from.parent.type.spec.code ||
                state.selection.$from
                  .marks()
                  .some((mark) => mark.type.spec.code)
              ) {
                return null;
              }
              const node = createWikiLinkNode(state, name, attrs);
              return node ? state.tr.replaceWith(start, end, node) : null;
            },
          ),
        ],
      }),
      activation: new Plugin({
        key: new PluginKey(`wiki-link-activation-${name}`),
        props: {
          handleDOMEvents: {
            keydown(view, event) {
              if (event.key !== 'Enter') return false;
              const attrs = attrsFromDomTarget(event.target);
              if (!attrs) return false;
              userConfig.onActivate?.(view, attrs);
              event.preventDefault();
              return true;
            },
          },
          handleClickOn(view, _pos, node) {
            if (node.type.name !== name) return false;
            userConfig.onActivate?.(view, node.attrs as WikiLinkAttrs);
            return true;
          },
          handleKeyDown(view, event) {
            if (event.key !== 'Enter') return false;
            const node = view.state.selection.$from.nodeAfter;
            if (node?.type.name !== name) return false;
            userConfig.onActivate?.(view, node.attrs as WikiLinkAttrs);
            return true;
          },
          decorations(state) {
            if (!userConfig.resolveTarget) return null;
            const decorations: ReturnType<typeof Decoration.node>[] = [];
            state.doc.descendants((node, pos) => {
              if (
                node.type.name === name &&
                !userConfig.resolveTarget?.(node.attrs as WikiLinkAttrs, state)
              ) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class:
                      'wiki-link-unresolved text-destructive line-through decoration-dotted',
                    'aria-label': `${displayText(node.attrs as WikiLinkAttrs)} (note not found)`,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    },
    command: {
      insertWikiLink:
        (attrs: WikiLinkAttrs): Command =>
        (state, dispatch) => {
          const node = createWikiLinkNode(state, name, attrs);
          if (!node) return false;
          if (dispatch) {
            const tr = state.tr.replaceSelectionWith(node);
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(tr.selection.to)),
            );
            dispatch(tr.scrollIntoView());
          }
          return true;
        },
    },
    markdown: {
      tokenizerPlugins: [wikiLinkTokenizer],
      nodes: {
        [name]: {
          parseMarkdown: {
            wiki_link: { node: name, getAttrs: (token) => token.meta },
          },
          toMarkdown(state, node) {
            const attrs = node.attrs as WikiLinkAttrs;
            state.text(wikiLinkText(attrs), false);
          },
        },
      },
    },
  });
}
