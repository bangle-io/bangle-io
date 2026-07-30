import {
  isListNode,
  type ListAttributes,
  type ListKind,
  type PMNode,
} from './pm';

/**
 * The list attributes shared by the editor commands and the Markdown codec.
 *
 * Lives apart from both so neither has to import the other: `list.ts` owns the
 * schema, plugins and commands, `list-markdown.ts` owns parse and serialize.
 */
export const LIST_KIND = {
  BULLET: 'bullet',
  ORDERED: 'ordered',
  TASK: 'task',
  TOGGLE: 'toggle',
} as const satisfies Record<string, ListKind>;

export type ListKindType = (typeof LIST_KIND)[keyof typeof LIST_KIND];

export type MarkdownListKind = 'bullet' | 'ordered';
export type MarkdownListAttrs = ListAttributes & {
  kind: ListKindType;
  listKind: MarkdownListKind;
  tight: boolean;
};

/**
 * Helper to read typed list attributes from a node
 * Returns null if the node is not a list node
 */
export function readListAttrs(node?: PMNode): MarkdownListAttrs | null {
  if (!node || !isListNode(node)) {
    return null;
  }
  const { kind, checked, collapsed, order, listKind, tight } = node.attrs;
  return {
    kind,
    listKind:
      listKind === LIST_KIND.ORDERED || kind === LIST_KIND.ORDERED
        ? LIST_KIND.ORDERED
        : LIST_KIND.BULLET,
    tight: tight !== false,
    ...(kind === LIST_KIND.TASK ? { checked } : {}),
    ...(kind === LIST_KIND.TOGGLE ? { collapsed } : {}),
    ...(kind === LIST_KIND.ORDERED ? { order } : {}),
  };
}
