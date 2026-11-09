import {
  listItemCanRenderTight,
  readListTokenMetadata,
  resolveListRunTightness,
  type TightListItemBlockKind,
} from '@bangle.io/markdown-syntax';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import type { CollectionType } from './common';
import {
  LIST_KIND,
  type MarkdownListAttrs,
  type MarkdownListKind,
  readListAttrs,
} from './list-attrs';
import { isListNode, type PMNode } from './pm';

type ListMarkdownSerializerState = MarkdownSerializerState & {
  [LIST_TIGHTNESS_CACHE]?: WeakMap<PMNode, readonly boolean[]>;
  flushClose(size?: number): void;
  inTightList: boolean;
};

const LIST_TIGHTNESS_CACHE = Symbol('listTightnessCache');

function isListMarkdownSerializerState(
  state: MarkdownSerializerState,
): state is ListMarkdownSerializerState {
  return (
    'inTightList' in state &&
    typeof state.inTightList === 'boolean' &&
    'flushClose' in state &&
    typeof state.flushClose === 'function'
  );
}

/**
 * Provides ProseMirror's parse and serialize handling for bullet, ordered,
 * and task lists. Toggle list is ignored in the parse/serialize logic.
 */
export function listMarkdown(listNodeName: string): CollectionType['markdown'] {
  return {
    nodes: {
      [listNodeName]: {
        // For serialization:
        toMarkdown: (state, node, parent, index) => {
          flatListToMarkdown(state, node, parent ?? null, index ?? 0);
        },
        // For parsing:
        parseMarkdown: {
          bullet_list: {
            ignore: true,
          },
          ordered_list: {
            ignore: true,
          },
          list_item: {
            block: listNodeName,
            getAttrs: (tok) => {
              const { kind, taskChecked, tight } = readListTokenMetadata(tok);
              if (taskChecked !== null) {
                return {
                  kind: LIST_KIND.TASK,
                  listKind: kind,
                  checked: taskChecked,
                  tight,
                };
              }
              return { kind, listKind: kind, tight };
            },
          },
        },
      },
    },
  };
}

function flatListToMarkdown(
  state: MarkdownSerializerState,
  node: PMNode,
  parent: PMNode | null,
  index: number,
) {
  if (!isListMarkdownSerializerState(state)) {
    throw new Error('Markdown serializer does not support list tightness');
  }
  const attrs = readListAttrs(node);
  if (!attrs) return;
  const tight = listRunIsTight(state, node, parent, index);
  const sameList = previousSiblingIsSameList(parent, index, attrs.listKind);
  if ((state.inTightList && !sameList) || (tight && sameList)) {
    state.flushClose(1);
  }

  const containerMarker = attrs.listKind === LIST_KIND.ORDERED ? '1.' : '-';
  const marker =
    attrs.kind === LIST_KIND.TASK
      ? `${containerMarker} [${attrs.checked ? 'x' : ' '}]`
      : containerMarker;
  const firstDelim = `${marker} `;
  const continuationDelim = ' '.repeat(containerMarker.length + 1);
  const previousTight = state.inTightList;
  state.inTightList = tight;
  state.wrapBlock(continuationDelim, firstDelim, node, () => {
    const firstChildIndex = firstRenderedListItemChild(node, attrs);
    const firstChild = node.maybeChild(firstChildIndex);
    const firstKind = firstChild ? listItemBlockKind(firstChild) : null;
    const taskStartsWithBlock =
      attrs.kind === LIST_KIND.TASK &&
      firstKind !== null &&
      firstKind !== 'paragraph';
    if (taskStartsWithBlock) {
      // The checkbox is an implicit empty paragraph before the actual block.
      state.closeBlock(node);
      state.flushClose(tight ? 1 : 2);
    } else if (isListNode(firstChild) || firstKind === 'thematic-break') {
      state.ensureNewLine();
    }
    let renderedChildCount = 0;
    node.forEach((child, _offset, childIndex) => {
      if (childIndex < firstChildIndex) return;
      // Nested list serializers own their run's tightness independently.
      if (renderedChildCount > 0 && tight && !isListNode(child)) {
        state.flushClose(1);
      }
      state.render(child, node, childIndex);
      renderedChildCount++;
    });
  });
  state.inTightList = previousTight;
}

function previousSiblingIsSameList(
  parent: PMNode | null,
  index: number,
  kind: MarkdownListKind,
): boolean {
  if (!parent || index === 0) return false;
  return readListAttrs(parent.child(index - 1))?.listKind === kind;
}

function listRunIsTight(
  state: ListMarkdownSerializerState,
  node: PMNode,
  parent: PMNode | null,
  index: number,
): boolean {
  if (!parent) {
    const attrs = readListAttrs(node);
    return attrs ? attrs.tight && flatListItemCanRenderTight(node) : true;
  }
  let cache = state[LIST_TIGHTNESS_CACHE];
  if (!cache) {
    cache = new WeakMap();
    state[LIST_TIGHTNESS_CACHE] = cache;
  }
  let tightness = cache.get(parent);
  if (!tightness) {
    tightness = listTightnessByChild(parent);
    cache.set(parent, tightness);
  }
  return tightness[index] ?? true;
}

function listTightnessByChild(parent: PMNode): readonly boolean[] {
  return resolveListRunTightness(
    Array.from({ length: parent.childCount }, (_, index) => {
      const child = parent.child(index);
      const attrs = readListAttrs(child);
      return attrs
        ? {
            kind: attrs.listKind,
            tight: attrs.tight && flatListItemCanRenderTight(child),
          }
        : null;
    }),
  );
}

function flatListItemCanRenderTight(node: PMNode): boolean {
  const attrs = readListAttrs(node);
  const firstChildIndex = attrs ? firstRenderedListItemChild(node, attrs) : 0;
  for (let index = firstChildIndex + 1; index < node.childCount; index++) {
    const child = node.child(index);
    if (isListNode(child) && listMarkerIsHidden(child)) return false;
  }
  const blocks = listItemBlockKinds(node, firstChildIndex);
  if (attrs?.kind === LIST_KIND.TASK && blocks[0] !== 'paragraph') {
    blocks.unshift('paragraph');
  }
  return listItemCanRenderTight(blocks);
}

function listMarkerIsHidden(node: PMNode): boolean {
  return isListNode(node.firstChild);
}

function firstRenderedListItemChild(
  node: PMNode,
  attrs: MarkdownListAttrs,
): number {
  if (attrs.kind === LIST_KIND.TASK) return 0;
  let index = 0;
  while (
    index < node.childCount - 1 &&
    node.child(index).type.name === 'paragraph' &&
    node.child(index).content.size === 0
  ) {
    index++;
  }
  return index;
}

function listItemBlockKinds(
  node: PMNode,
  startIndex: number,
): TightListItemBlockKind[] {
  const blocks: TightListItemBlockKind[] = [];
  node.forEach((child, _offset, index) => {
    if (index >= startIndex) blocks.push(listItemBlockKind(child));
  });
  return blocks;
}

function listItemBlockKind(node: PMNode): TightListItemBlockKind {
  if (isListNode(node)) return 'list';
  switch (node.type.name) {
    case 'paragraph':
      return 'paragraph';
    case 'blockquote':
      return 'blockquote';
    case 'horizontalRule':
      return 'thematic-break';
    case 'table':
      return 'table';
    case 'code_block':
    case 'heading':
    case 'math_display':
      return 'self-terminating';
    default:
      return 'unknown';
  }
}
