import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
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

export type WikiLinkConfig = {
  name?: string;
  onActivate?: (view: EditorView, attrs: WikiLinkAttrs) => void;
  resolveTarget?: (attrs: WikiLinkAttrs, state: EditorState) => boolean;
};

const wikiPattern = /\[\[([^[\]\n|]+)(?:\|([^[\]\n]*))?\]\]/g;

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
  return wikiTarget
    ? { target: wikiTarget, label: element.dataset.wikiLabel ?? null }
    : null;
}

function wikiLinkTokenizer(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'wiki_link', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue;
      const children: Token[] = [];
      for (const token of blockToken.children) {
        if (token.type !== 'text' || !token.content.includes('[[')) {
          children.push(token);
          continue;
        }
        let offset = 0;
        for (const match of token.content.matchAll(wikiPattern)) {
          const index = match.index;
          const prefix = token.content.slice(0, index);
          if (prefix.lastIndexOf('[[') > prefix.lastIndexOf(']]')) {
            continue;
          }
          if (index > offset) {
            const text = new state.Token('text', '', 0);
            text.content = token.content.slice(offset, index);
            children.push(text);
          }
          const wiki = new state.Token('wiki_link', '', 0);
          wiki.meta = {
            target: match[1] ?? '',
            label: match[2] ?? null,
          } satisfies WikiLinkAttrs;
          children.push(wiki);
          offset = index + match[0].length;
        }
        if (offset < token.content.length) {
          const text = new state.Token('text', '', 0);
          text.content = token.content.slice(offset);
          children.push(text);
        }
      }
      blockToken.children = children;
    }
  });
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
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) return false;
            const target = dom.dataset.wikiLink;
            return target
              ? { target, label: dom.dataset.wikiLabel ?? null }
              : false;
          },
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
        return `[[${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}]]`;
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
              const target = match[1];
              if (
                !target ||
                state.selection.$from.parent.type.spec.code ||
                state.selection.$from
                  .marks()
                  .some((mark) => mark.type.spec.code)
              ) {
                return null;
              }
              const node = state.schema.nodes[name]?.create({
                target,
                label: match[2] ?? null,
              } satisfies WikiLinkAttrs);
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
          const node = state.schema.nodes[name]?.create(attrs);
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
            state.text(
              `[[${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}]]`,
              false,
            );
          },
        },
      },
    },
  });
}
