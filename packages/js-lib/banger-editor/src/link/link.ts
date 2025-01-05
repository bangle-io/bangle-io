import { type CollectionType, collection } from '../common';
import { type Command, type EditorState, PluginKey } from '../pm';
import { Plugin as PMPlugin } from '../pm';
import type { EditorProps } from '../pm';
import { InputRule, inputRules } from '../pm';
import type { Mark, MarkSpec, PMNode } from '../pm';
import { filterCommand } from '../pm-utils';
import { isMarkActiveInSelection, mapSlice, matchAllPlus } from '../pm-utils';
import { getMarkType } from '../pm-utils';
import { LINK_INPUT_REGEX, URL_REGEX } from './url-regex';

/**
 * Typed attributes for the link mark
 */
type LinkAttrs = {
  href: string | null;
  title: string | null;
};

/**
 * Helper to create typed link attributes
 * Handles sanitization of inputs and provides flexible input handling
 */
function createLinkAttrs({
  href = null,
  title = null,
}: {
  href?: string | null | undefined;
  title?: string | null | undefined;
} = {}): LinkAttrs {
  return {
    href: href ? href.trim() || null : null,
    title: title ? title.trim() || null : null,
  };
}

/**
 * Helper to read typed link attributes from a mark
 */
function readLinkAttrs(mark?: Mark): LinkAttrs | undefined {
  if (!mark) {
    return undefined;
  }
  const { href, title } = (mark.attrs as LinkAttrs) ?? {};
  return { href, title };
}

export type LinkConfig = {
  /**
   * Mark name, defaults to 'link'.
   */
  name?: string;

  /**
   * Controls link click behavior:
   * - true: opens link on any click
   * - 'meta': opens link only on Cmd/Ctrl+click
   * - false: disables link opening
   * Defaults to 'meta'.
   */
  openOnClick?: boolean | 'meta';

  /**
   * Whether to open links in a new tab. Defaults to true.
   */
  openNewTab?: boolean;

  /**
   * Whether to auto-link typed text, e.g., "example.com ". Defaults to true.
   */
  autoLink?: boolean;

  /**
   * Whether to transform pastes that are plain text URLs into links. Defaults to true.
   */
  pasteLink?: boolean;

  /**
   * Whether to apply link marks on matching markdown patterns in the clipboard. Defaults to true.
   */
  markdownPaste?: boolean;
};

type RequiredConfig = Required<LinkConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'link',
  openOnClick: 'meta',
  openNewTab: true,
  autoLink: true,
  pasteLink: true,
  markdownPaste: true,
};

/**
 * Setup link plugin
 */
export function setupLink(userConfig?: LinkConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const marks = {
    [name]: {
      attrs: {
        href: {
          default: null,
        },
        title: {
          default: null,
        },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (dom) =>
            createLinkAttrs({
              href: dom.getAttribute('href'),
              title: dom.getAttribute('title'),
            }),
        },
      ],
      toDOM: (mark) => {
        const { href, title } = mark.attrs as LinkAttrs;
        return [
          'a',
          {
            href: href,
            title: title ?? null,
            rel: 'noopener noreferrer nofollow',
          },
          0,
        ];
      },
    } satisfies MarkSpec,
  };

  const plugin = {
    inputRules: pluginAutoLinkInputRules(config),
    pasteRules: pluginPasteRules(config),
    pasteRulesMarkdown: pluginPasteRulesMarkdown(config),
    openOnClick: pluginOpenOnClick(config),
  };

  return collection({
    id: name,
    marks,
    plugin,
    command: {
      updateLink: updateLink(config),
      createLink: createLink(config),
    },
    query: {
      isLinkActive: isLinkActive(config),
      isSelectionAroundLink: isSelectionAroundLink(config),
      linkAllowedInRange: linkAllowedInRange(config),
      getLinkDetails: getLinkDetails(config),
    },
    markdown: markdown(config),
  });
}

/**
 * Helper: Remove and/or add link mark on a transaction
 */
function replaceLinkMark(
  config: RequiredConfig,
  state: EditorState,
  from: number,
  to: number,
  href?: string,
) {
  const linkMark = getMarkType(state.schema, config.name);
  let tr = state.tr.removeMark(from, to, linkMark);

  if (href) {
    // use typed attributes
    const mark = linkMark.create(createLinkAttrs({ href }));
    tr = tr.addMark(from, to, mark);
  }
  return tr;
}

/**
 * COMMANDS
 */

function createLink(config: RequiredConfig) {
  return (href: string) =>
    filterCommand(
      (state) =>
        linkAllowedInRange(config)(
          state,
          state.selection.$from.pos,
          state.selection.$to.pos,
        ),
      (state, dispatch) => {
        const { $from, $to } = state.selection;
        const tr = replaceLinkMark(config, state, $from.pos, $to.pos, href);
        dispatch?.(tr);
        return true;
      },
    );
}

/**
 * Update link in a selection or in the node under the cursor.
 */
function updateLink(config: RequiredConfig) {
  return (href?: string): Command => {
    return (state, dispatch) => {
      if (!state.selection.empty) {
        return setLink(
          config,
          state.selection.from,
          state.selection.to,
          href,
        )(state, dispatch);
      }

      const { $from } = state.selection;
      const pos = $from.pos - $from.textOffset;
      const node = state.doc.nodeAt(pos);
      let to = pos;
      if (node) {
        to += node.nodeSize;
      }

      return setLink(config, pos, to, href)(state, dispatch);
    };
  };
}

/**
 * Sets or removes the link mark on text from `from` to `to`.
 */
function setLink(
  config: RequiredConfig,
  from: number,
  to: number,
  href?: string,
): Command {
  return filterCommand(
    (state) => {
      const node = state.doc.nodeAt(from);
      return !!node && node.isText;
    },
    (state, dispatch) => {
      const tr = replaceLinkMark(config, state, from, to, href);
      dispatch?.(tr);
      return true;
    },
  );
}

/**
 * PLUGINS
 */
function pluginAutoLinkInputRules(config: RequiredConfig) {
  return () => {
    if (!config.autoLink) {
      return null;
    }
    return inputRules({
      rules: [
        new InputRule(URL_REGEX, (state, match, start, end) => {
          const linkMarkType = getMarkType(state.schema, config.name);
          if (!match[0]) {
            return null;
          }
          const [_, leadingSpace, text, scheme] = match;

          // Check if there's already a link mark in the typed range
          let ignore = false;
          state.doc.nodesBetween(start, end, (node) => {
            if (ignore) {
              return false;
            }
            if (linkMarkType.isInSet(node.marks)) {
              ignore = true;
              return false;
            }
            return true;
          });
          if (ignore) {
            return null;
          }

          const href = scheme ? text : `http://${text}`;
          const tr = state.tr;

          // If there's a leading space, skip marking that space
          tr.addMark(
            leadingSpace && leadingSpace.length > 0 ? start + 1 : start,
            end,
            linkMarkType.create(createLinkAttrs({ href })),
          );
          // Insert a space after the URL
          tr.insertText(' ', end);
          return tr;
        }),
      ],
    });
  };
}

function pluginPasteRules(config: RequiredConfig) {
  return () => {
    if (!config.pasteLink) {
      return null;
    }
    return new PMPlugin({
      key: new PluginKey('link-paste'),
      props: {
        handlePaste: (view, rawEvent) => {
          const event = rawEvent as ClipboardEvent;
          if (!event.clipboardData) {
            return false;
          }
          const text = event.clipboardData.getData('text/plain');
          const html = event.clipboardData.getData('text/html');

          // If purely plain text and a single URL, convert selection to link.
          if (!html && text && view.state.selection.empty) {
            const matches = matchAllPlus(LINK_INPUT_REGEX, text);
            const singleMatch =
              matches.length === 1 && matches.every((m) => m.match);

            if (!singleMatch) {
              return false;
            }

            const linkMarkType = getMarkType(view.state.schema, config.name);
            const { from } = view.state.selection;

            // Create a transaction that first inserts the text
            let tr = view.state.tr.insertText(text, from, from);

            // Then add the link mark to the inserted text
            tr = tr.addMark(
              from,
              from + text.length,
              linkMarkType.create(createLinkAttrs({ href: text })),
            );

            view.dispatch(tr);
            return true;
          }
          return false;
        },
      } as EditorProps,
    });
  };
}

function pluginPasteRulesMarkdown(config: RequiredConfig) {
  return () => {
    if (!config.markdownPaste) {
      return null;
    }
    return new PMPlugin({
      key: new PluginKey('link-markdown-paste'),
      props: {
        transformPasted: (slice, view) => {
          const linkType = getMarkType(view.state.schema, config.name);

          return mapSlice(slice, (node, parent) => {
            if (!node.isText || node.text === undefined) {
              return node;
            }

            // Skip if parent doesn't allow link mark
            if (parent && !parent.type.allowsMarkType(linkType)) {
              return node;
            }

            const text = node.text;
            const matches = matchAllPlus(LINK_INPUT_REGEX, text);

            return matches.map(({ start, end, match, subString }) => {
              let newNode = node.cut(start, end);
              if (match) {
                const mark = linkType.create(
                  createLinkAttrs({ href: subString }),
                );
                newNode = newNode.mark(mark.addToSet(node.marks));
              }
              return newNode;
            });
          });
        },
      } as EditorProps,
    });
  };
}

/**
 * Open-on-click plugin
 */
function pluginOpenOnClick(config: RequiredConfig) {
  return () => {
    if (!config.openOnClick) {
      return null;
    }
    return new PMPlugin({
      key: new PluginKey('link-openOnClick'),
      props: {
        handleClick: (view, pos, event) => {
          // Check if we're in a browser environment
          if (typeof window === 'undefined') {
            return false;
          }

          if (event.button !== 0 || !view.editable) {
            return false;
          }

          const state = view.state;
          const $pos = state.doc.resolve(pos);

          // Traverse marks at the clicked position
          let linkMark = null;
          for (let i = 0; i < $pos.marks().length; i++) {
            if ($pos.marks()[i]?.type.name === config.name) {
              linkMark = $pos.marks()[i];
              break;
            }
          }

          if (!linkMark) {
            return false;
          }

          const attrs = readLinkAttrs(linkMark);
          const href = attrs?.href;
          if (href) {
            if (
              config.openOnClick === true ||
              (config.openOnClick === 'meta' &&
                (event.metaKey || event.ctrlKey))
            ) {
              event.preventDefault();
              window.open(href, config.openNewTab ? '_blank' : '_self');
              return true;
            }
          }

          return false;
        },
      },
    });
  };
}

/**
 * QUERIES
 */
function isLinkActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const linkMark = getMarkType(state.schema, config.name);
    return isMarkActiveInSelection(linkMark, state);
  };
}

function isSelectionAroundLink(config: RequiredConfig) {
  return (state: EditorState) => {
    const linkMark = getMarkType(state.schema, config.name);
    const { $from, $to } = state.selection;
    const node = $from.nodeAfter;
    if (!node) {
      return false;
    }
    return (
      $from.textOffset === 0 &&
      $to.pos - $from.pos === node.nodeSize &&
      !!linkMark.isInSet(node.marks)
    );
  };
}

function linkAllowedInRange(config: RequiredConfig) {
  return (state: EditorState, from: number, to: number) => {
    const linkMark = getMarkType(state.schema, config.name);
    const $from = state.doc.resolve(from);
    const $to = state.doc.resolve(to);
    if ($from.parent === $to.parent && $from.parent.isTextblock) {
      return $from.parent.type.allowsMarkType(linkMark);
    }
    return false;
  };
}

function getLinkDetails(config: RequiredConfig) {
  return (state: EditorState) => {
    const linkMark = getMarkType(state.schema, config.name);
    const { $from } = state.selection;
    const pos = $from.pos - $from.textOffset;
    const node = state.doc.nodeAt(pos);
    if (!node) {
      return undefined;
    }

    const mark = linkMark.isInSet(node.marks || []);
    if (mark) {
      return {
        ...readLinkAttrs(mark),
        text: node.textContent,
      };
    }
    return undefined;
  };
}

/**
 * MARKDOWN
 */
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    marks: {
      [name]: {
        toMarkdown: {
          open(_state, mark, parent, index) {
            return isPlainURL(mark, parent, index, 1) ? '<' : '[';
          },
          close(state, mark, parent, index) {
            if (isPlainURL(mark, parent, index, -1)) {
              return '>';
            }
            const { href, title } = readLinkAttrs(mark) ?? {};
            const titleAttr = title ? ` ${quote(title)}` : '';
            return `](${state.esc(href || '')}${titleAttr})`;
          },
        },
        parseMarkdown: {
          link: {
            mark: name,
            getAttrs: (tok) =>
              createLinkAttrs({
                href: tok.attrGet('href'),
                title: tok.attrGet('title'),
              }),
          },
        },
      },
    },
  };
}

/**
 * Utility: check if the link can be written as a plain URL.
 */
function isPlainURL(link: Mark, parent: PMNode, index: number, side: number) {
  const { href, title } = readLinkAttrs(link) ?? {};
  if (title || !href || !/^\w+:/.test(href)) {
    return false;
  }

  // Add bounds checking
  const contentIndex = index + (side < 0 ? -1 : 0);
  const nextIndex = index + (side < 0 ? -2 : 1);
  if (contentIndex < 0 || contentIndex >= parent.childCount) {
    return false;
  }

  const content = parent.child(contentIndex);
  if (
    !content.isText ||
    content.text !== href ||
    content.marks[content.marks.length - 1] !== link
  ) {
    return false;
  }

  if (index === (side < 0 ? 1 : parent.childCount - 1)) {
    return true;
  }

  // Add bounds checking for next node
  if (nextIndex < 0 || nextIndex >= parent.childCount) {
    return false;
  }

  const next = parent.child(nextIndex);
  return !link.isInSet(next.marks);
}

function quote(str: string) {
  const wrap = str.includes('"') ? "'" : '"';
  return wrap + str + wrap;
}
