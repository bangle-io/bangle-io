import { type CollectionType, collection } from '../common';
import type {
  EditorProps,
  EditorView,
  Mark,
  MarkSpec,
  MarkType,
  PMNode,
} from '../pm';
import {
  type Command,
  type EditorState,
  InputRule,
  inputRules,
  PluginKey,
  Plugin as PMPlugin,
  TextSelection,
} from '../pm';
import {
  filterCommand,
  getMarkType,
  isMarkActiveInSelection,
  mapSlice,
  matchAllPlus,
} from '../pm-utils';
import { LINK_INPUT_REGEX, URL_REGEX } from './url-regex';

/**
 * Typed attributes for the link mark
 */
type LinkAttrs = {
  href: string | null;
  title: string | null;
};

/** The complete contiguous link run around the current selection. */
export type LinkRange = {
  from: number;
  to: number;
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

  /**
   * Optional callback to handle links before browser navigation.
   * Return true to indicate the link was handled internally.
   */
  onOpenLink?: (
    href: string,
    context: { event: MouseEvent; view: EditorView },
  ) => boolean | Promise<boolean>;
};

type RequiredConfig = Required<Omit<LinkConfig, 'onOpenLink'>> &
  Pick<LinkConfig, 'onOpenLink'>;

export const LINK_OPEN_MODIFIER_CLASS = 'bangle-link-open-modifier';

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'link',
  openOnClick: 'meta',
  openNewTab: true,
  autoLink: true,
  pasteLink: true,
  markdownPaste: true,
  onOpenLink: () => false,
};

/**
 * Setup link plugin
 */
export function setupLink(userConfig?: LinkConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    onOpenLink: userConfig?.onOpenLink ?? DEFAULT_CONFIG.onOpenLink,
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
    id: 'link',
    marks,
    plugin,
    command: {
      updateLink: updateLink(config),
      createLink: createLink(config),
      expandLinkSelection: expandLinkSelectionFor(config.name),
    },
    query: {
      isLinkActive: isLinkActive(config),
      isSelectionAroundLink: isSelectionAroundLink(config),
      linkAllowedInRange: linkAllowedInRange(config),
      getLinkDetails: getLinkDetails(config),
      getLinkMark: getLinkMark(config),
      getLinkRangeAtSelection: getLinkRangeAtSelectionFor(config.name),
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
        const linkRange = getLinkRangeAtSelectionFor(config.name)(state);
        return setLink(
          config,
          linkRange?.from ?? state.selection.from,
          linkRange?.to ?? state.selection.to,
          href,
        )(state, dispatch);
      }

      const range = getLinkRangeAtSelectionFor(config.name)(state);
      if (!range) {
        return false;
      }
      return setLink(config, range.from, range.to, href)(state, dispatch);
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
      view: (view) => {
        const ownerDocument = view.dom.ownerDocument;
        const ownerWindow = ownerDocument.defaultView;
        const setModifierActive = (active: boolean) => {
          view.dom.classList.toggle(LINK_OPEN_MODIFIER_CLASS, active);
        };
        const syncModifier = (event: KeyboardEvent | MouseEvent) => {
          setModifierActive(event.metaKey || event.ctrlKey);
        };
        const clearModifier = () => setModifierActive(false);

        ownerDocument.addEventListener('keydown', syncModifier);
        ownerDocument.addEventListener('keyup', syncModifier);
        ownerDocument.addEventListener('mousemove', syncModifier);
        ownerWindow?.addEventListener('blur', clearModifier);

        return {
          destroy: () => {
            clearModifier();
            ownerDocument.removeEventListener('keydown', syncModifier);
            ownerDocument.removeEventListener('keyup', syncModifier);
            ownerDocument.removeEventListener('mousemove', syncModifier);
            ownerWindow?.removeEventListener('blur', clearModifier);
          },
        };
      },
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
            const canOpenExternal =
              config.openOnClick === true ||
              (config.openOnClick === 'meta' &&
                (event.metaKey || event.ctrlKey));

            if (!canOpenExternal) {
              const handled = config.onOpenLink(href, { event, view });
              if (handled instanceof Promise) {
                handled
                  .then((isHandled) => {
                    if (isHandled) {
                      event.preventDefault();
                    }
                  })
                  .catch(() => {
                    // ignore and let editor keep default click behavior
                  });
                return false;
              }
              if (handled) {
                event.preventDefault();
                return true;
              }
              return false;
            }

            if (canOpenExternal) {
              event.preventDefault();
              const openExternal = () => {
                window.open(
                  href,
                  config.openNewTab ? '_blank' : '_self',
                  config.openNewTab ? 'noopener,noreferrer' : undefined,
                );
              };
              const handled = config.onOpenLink(href, { event, view });
              if (handled instanceof Promise) {
                handled
                  .then((isHandled) => {
                    if (!isHandled) {
                      openExternal();
                    }
                  })
                  .catch(() => {
                    openExternal();
                  });
                return true;
              }
              if (handled) {
                return true;
              }
              openExternal();
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
      return (
        $from.parent.type.allowsMarkType(linkMark) &&
        rangeAllowsLinkMark(state, from, to, linkMark)
      );
    }
    return false;
  };
}

function rangeAllowsLinkMark(
  state: EditorState,
  from: number,
  to: number,
  linkMarkType: MarkType,
) {
  if (from === to) {
    return true;
  }

  let allowed = true;
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (!allowed) {
      return false;
    }
    if (!node.isInline) {
      return true;
    }

    const nodeFrom = pos;
    const nodeTo = pos + node.nodeSize;
    if (nodeTo <= from || nodeFrom >= to) {
      return false;
    }

    if (!node.isText) {
      allowed = false;
      return false;
    }

    if (parent && !parent.type.allowsMarkType(linkMarkType)) {
      allowed = false;
      return false;
    }

    if (
      node.marks.some(
        (mark) =>
          mark.type !== linkMarkType &&
          (mark.type.excludes(linkMarkType) ||
            linkMarkType.excludes(mark.type)),
      )
    ) {
      allowed = false;
      return false;
    }

    return false;
  });

  return allowed;
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

function getLinkMark(config: RequiredConfig) {
  return (state: EditorState) => {
    const linkMark = getMarkType(state.schema, config.name);
    return linkMark;
  };
}

function getLinkRangeAtSelectionFor(name: string) {
  return (state: EditorState): LinkRange | undefined => {
    const linkType = state.schema.marks[name];
    if (!linkType) {
      return undefined;
    }

    const { selection } = state;
    if (selection.$from.parent !== selection.$to.parent) {
      return undefined;
    }

    let candidate: Mark | undefined;
    if (selection.empty) {
      candidate = linkType.isInSet(selection.$from.marks());
    } else {
      let foundInline = false;
      let invalid = false;
      state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (!node.isInline) {
          return !invalid;
        }
        const nodeFrom = pos;
        const nodeTo = pos + node.nodeSize;
        if (nodeTo <= selection.from || nodeFrom >= selection.to) {
          return false;
        }
        foundInline = true;
        const mark = linkType.isInSet(node.marks);
        if (!mark || (candidate && !candidate.eq(mark))) {
          invalid = true;
          return false;
        }
        candidate ??= mark;
        return false;
      });
      if (!foundInline || invalid) {
        return undefined;
      }
    }

    if (!candidate) {
      return undefined;
    }
    const linkMark = candidate;

    const parent = selection.$from.parent;
    const parentStart = selection.$from.start();
    let offset = 0;
    let runFrom: number | undefined;
    let runTo: number | undefined;
    const runs: Array<{ from: number; to: number }> = [];

    parent.forEach((node) => {
      const nodeFrom = parentStart + offset;
      const nodeTo = nodeFrom + node.nodeSize;
      const mark = node.isInline ? linkType.isInSet(node.marks) : undefined;

      if (mark?.eq(linkMark)) {
        if (runFrom === undefined) {
          runFrom = nodeFrom;
        }
        runTo = nodeTo;
      } else if (runFrom !== undefined && runTo !== undefined) {
        runs.push({ from: runFrom, to: runTo });
        runFrom = undefined;
        runTo = undefined;
      }

      offset += node.nodeSize;
    });

    if (runFrom !== undefined && runTo !== undefined) {
      runs.push({ from: runFrom, to: runTo });
    }

    const run = runs.find(
      ({ from, to }) => selection.from >= from && selection.to <= to,
    );

    if (!run) {
      return undefined;
    }

    const attrs = readLinkAttrs(linkMark);
    return {
      from: run.from,
      to: run.to,
      href: attrs?.href ?? null,
      title: attrs?.title ?? null,
    };
  };
}

/**
 * Returns a range only when the selection is wholly contained by one
 * contiguous link run with identical attributes.
 */
export function getLinkRangeAtSelection(
  state: EditorState,
): LinkRange | undefined {
  return getLinkRangeAtSelectionFor('link')(state);
}

function expandLinkSelectionFor(name: string): Command {
  return (state, dispatch) => {
    const range = getLinkRangeAtSelectionFor(name)(state);
    if (!range) {
      return false;
    }
    dispatch?.(
      state.tr.setSelection(
        TextSelection.create(state.doc, range.from, range.to),
      ),
    );
    return true;
  };
}

/** Selects the complete contiguous link run without changing the document. */
export function expandLinkSelection(): Command {
  return expandLinkSelectionFor('link');
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
