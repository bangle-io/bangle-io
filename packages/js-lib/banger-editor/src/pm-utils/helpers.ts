import {
  type EditorState,
  type Mark,
  type MarkType,
  type NodeType,
  PMNode,
  type ParseOptions,
  type ResolvedPos,
  type Schema,
  Slice,
} from '../pm';
import { DOMParser, Fragment, NodeSelection, type PMSelection } from '../pm';
import { Plugin, type Transaction } from '../pm';

import { InputRule } from '../pm';
import { setTextSelection } from './transforms';
import type { Content, NodeTypeParam } from './types';

// Checks if current selection is a `NodeSelection`.
export const isNodeSelection = (
  selection: PMSelection,
): selection is NodeSelection => {
  return selection instanceof NodeSelection;
};

// Checks if the type a given `node` equals to a given `nodeType`.
export const equalNodeType = (
  nodeType: NodeTypeParam,
  node: PMNode,
): boolean => {
  return (
    (Array.isArray(nodeType) && nodeType.indexOf(node.type) > -1) ||
    node.type === nodeType
  );
};

// Creates a new transaction object from a given transaction
export const cloneTr = (tr: Transaction): Transaction => {
  return Object.assign(Object.create(tr), tr).setTime(Date.now());
};

// Returns a `replace` transaction that replaces a node at a given position with the given `content`.
export const replaceNodeAtPos =
  (position: number, content: Content) =>
  (tr: Transaction): Transaction => {
    const node = tr.doc.nodeAt(position);
    const $pos = tr.doc.resolve(position);
    if (!node) {
      return tr;
    }

    if (canReplace($pos, content)) {
      // biome-ignore lint/style/noParameterAssign: <explanation>
      tr = tr.replaceWith(position, position + node.nodeSize, content);
      const start = tr.selection.$from.pos - 1;
      // biome-ignore lint/style/noParameterAssign: <explanation>
      tr = setTextSelection(Math.max(start, 0), -1)(tr);
      // biome-ignore lint/style/noParameterAssign: <explanation>
      tr = setTextSelection(tr.selection.$from.start())(tr);
      return cloneTr(tr);
    }
    return tr;
  };

// Checks if replacing a node at a given `$pos` inside of the `doc` node with the given `content` is possible.
export const canReplace = ($pos: ResolvedPos, content: Content): boolean => {
  const node = $pos.node($pos.depth);
  return node?.type.validContent(
    content instanceof Fragment ? content : Fragment.from(content),
  );
};

// Returns a `delete` transaction that removes a node at a given position.
export const removeNodeAtPos =
  (position: number) =>
  (tr: Transaction): Transaction => {
    const node = tr.doc.nodeAt(position);
    if (!node) {
      return tr;
    }
    return cloneTr(tr.delete(position, position + node.nodeSize));
  };

// Checks if a given `content` can be inserted at the given `$pos`
export const canInsert = ($pos: ResolvedPos, content: Content): boolean => {
  const index = $pos.index();

  if (content instanceof Fragment) {
    return $pos.parent.canReplace(index, index, content);
  }
  if (content instanceof PMNode) {
    return $pos.parent.canReplaceWith(index, index, content.type);
  }
  return false;
};

// Checks if a given `node` is an empty paragraph
export const isEmptyParagraph = (node: PMNode): boolean => {
  return !node || (node.type.name === 'paragraph' && node.nodeSize === 2);
};

export const checkInvalidMovements = (
  originIndex: number,
  targetIndex: number,
  targets: number[],
  type: unknown,
): boolean => {
  const direction = originIndex > targetIndex ? -1 : 1;
  const errorMessage = `Target position is invalid, you can't move the ${type} ${originIndex} to ${targetIndex}, the target can't be split. You could use tryToFit option.`;

  if (direction === 1) {
    if (targets.slice(0, targets.length - 1).indexOf(targetIndex) !== -1) {
      throw new Error(errorMessage);
    }
  } else {
    if (targets.slice(1).indexOf(targetIndex) !== -1) {
      throw new Error(errorMessage);
    }
  }

  return true;
};

/**
 * Checks if the given mark is active in the given range.
 *
 * @param type - The type of the mark to check.
 * @param state - The editor state.
 * @returns True if the mark is active, false otherwise.
 */
export function isMarkActiveInSelection(
  type: MarkType,
  state: EditorState,
): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) {
    return Boolean(type.isInSet(state.tr.storedMarks || $from.marks()));
  }
  return Boolean(state.doc.rangeHasMark(from, to, type));
}

export function markInputRule(regexp: RegExp, markType: MarkType): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const { tr } = state;
    const m = match.length - 1;
    let markEnd = end;
    let markStart = start;

    const matchMths = match[m];
    const firstMatch = match[0];
    const mathOneBeforeM = match[m - 1];

    if (matchMths != null && firstMatch != null && mathOneBeforeM != null) {
      const matchStart = start + firstMatch.indexOf(mathOneBeforeM);
      const matchEnd = matchStart + mathOneBeforeM.length - 1;
      const textStart = matchStart + mathOneBeforeM.lastIndexOf(matchMths);
      const textEnd = textStart + matchMths.length;

      const excludedMarks = getMarksBetween(start, end, state)
        .filter((item) => {
          return item.mark.type.excludes(markType);
        })
        .filter((item) => item.end > matchStart);

      if (excludedMarks.length) {
        return null;
      }

      if (textEnd < matchEnd) {
        tr.delete(textEnd, matchEnd);
      }
      if (textStart > matchStart) {
        tr.delete(matchStart, textStart);
      }
      markStart = matchStart;
      markEnd = markStart + matchMths.length;
    }

    tr.addMark(markStart, markEnd, markType.create());
    tr.removeStoredMark(markType);
    return tr;
  });
}

export function markPastePlugin(
  regexp: RegExp,
  type: MarkType,
  getAttrs?: Mark['attrs'] | ((match: RegExpMatchArray) => Mark['attrs']),
) {
  const handler = (fragment: Fragment, parent?: PMNode) => {
    const nodes: PMNode[] = [];

    fragment.forEach((child) => {
      if (child.isText) {
        const { text, marks } = child;
        let pos = 0;
        let match: RegExpMatchArray | null = null;

        // TODO hardcoded LINK , we should make it dynamic
        const isLink = !!marks.filter((x) => x.type.name === 'link')[0];

        while (
          !isLink &&
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
          (match = regexp.exec(text!)) !== null
        ) {
          if (parent?.type.allowsMarkType(type) && match[1]) {
            const start = match.index;
            if (start === undefined) {
              continue;
            }
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            const end = start + match[0]!.length;
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            const textStart = start + match[0]!.indexOf(match[1]);
            const textEnd = textStart + match[1].length;
            const attrs =
              getAttrs instanceof Function ? getAttrs(match) : getAttrs;

            // adding text before markdown to nodes
            if (start > 0) {
              nodes.push(child.cut(pos, start));
            }

            // adding the markdown part to nodes
            nodes.push(
              child
                .cut(textStart, textEnd)
                .mark(type.create(attrs).addToSet(child.marks)),
            );

            pos = end;
          }
        }

        // adding rest of text to nodes
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        if (pos < text!.length) {
          nodes.push(child.cut(pos));
        }
      } else {
        nodes.push(child.copy(handler(child.content, child)));
      }
    });

    return Fragment.fromArray(nodes);
  };

  return new Plugin({
    props: {
      transformPasted: (slice: Slice) =>
        new Slice(handler(slice.content), slice.openStart, slice.openEnd),
    },
  });
}

/**
 * Returns the marks between the given positions.
 *
 * @param start - The starting position.
 * @param end - The ending position.
 * @param state - The editor state.
 * @returns An array of marks between the given positions.
 */
function getMarksBetween(start: number, end: number, state: EditorState) {
  let marks: Array<{ start: number; end: number; mark: Mark }> = [];

  state.doc.nodesBetween(start, end, (node, pos) => {
    marks = [
      ...marks,
      ...node.marks.map((mark) => ({
        start: pos,
        end: pos + node.nodeSize,
        mark,
      })),
    ];
  });

  return marks;
}

export function mapChildren<T>(
  node: PMNode | Fragment,
  callback: (child: PMNode, index: number, frag: Fragment) => T,
): T[] {
  const array = [];
  for (let i = 0; i < node.childCount; i++) {
    array.push(
      callback(
        node.child(i),
        i,
        node instanceof Fragment ? node : node.content,
      ),
    );
  }

  return array;
}

/**
 * Creates a new PMNode from the given content.
 * content can be a string, a PMNode, an object
 *
 */
export function createDocument({
  schema,
  content,
  domParseOptions,
}: {
  schema: Schema;
  content?: string | PMNode | object;
  domParseOptions?: ParseOptions;
}): PMNode | undefined {
  const emptyDocument = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  };

  if (content == null || content === '') {
    return schema.nodeFromJSON(emptyDocument);
  }

  if (content instanceof PMNode) {
    return content;
  }

  if (typeof content === 'object') {
    return schema.nodeFromJSON(content);
  }

  if (typeof content === 'string') {
    const element = document.createElement('div');
    element.innerHTML = content.trim();
    return DOMParser.fromSchema(schema).parse(element, domParseOptions);
  }

  return undefined;
}

export function isDocEmpty(doc: PMNode) {
  if (doc.childCount === 0) return true;

  let isEmpty = true;
  doc.forEach((child) => {
    if (child.content.size > 0) {
      isEmpty = false;
    }
  });

  return isEmpty;
}

class MatchType {
  constructor(
    public start: number,
    public end: number,
    public match: boolean,
    private _sourceString: string,
  ) {}

  get subString() {
    return this._sourceString.slice(this.start, this.end);
  }
}
/**
 *
 * Returns an array of objects which contains a range of substring and whether it matched or didn't match.
 * Note: each item in this array will map 1:1 in order with the original string in a way
 *  such that following will always hold true:
 * ```
 * const result = matchAllPlus(regex, myStr);
 * result.reduce((a, b) => a + b.subString) === myStr
 * result.reduce((a, b) => a + b.slice(b.start, b.end)) === myStr
 * ```
 */
export function matchAllPlus(regexp: RegExp, str: string): MatchType[] {
  const result: MatchType[] = [];
  let prevElementEnd = 0;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = regexp.exec(str))) {
    const curStart = match.index;
    const curEnd = curStart + match[0].length;
    if (prevElementEnd !== curStart) {
      result.push(new MatchType(prevElementEnd, curStart, false, str));
    }
    result.push(new MatchType(curStart, curEnd, true, str));
    prevElementEnd = curEnd;
  }
  if (result.length === 0) {
    return [new MatchType(0, str.length, false, str)];
  }

  const lastItemEnd =
    result[result.length - 1] && result[result.length - 1]?.end;

  if (lastItemEnd && lastItemEnd !== str.length) {
    result.push(new MatchType(lastItemEnd, str.length, false, str));
  }
  return result;
}

type MapFragmentCallback = (
  node: PMNode,
  parent: PMNode | undefined,
  index: number,
) => PMNode | PMNode[] | Fragment | null;

export function mapSlice(slice: Slice, callback: MapFragmentCallback) {
  const fragment = mapFragment(slice.content, callback);
  return new Slice(fragment, slice.openStart, slice.openEnd);
}

export function mapFragment(
  content: Fragment,
  callback: MapFragmentCallback,
  parent?: PMNode,
  /*: (
    node: Node,
    parent: Node | null,
    index: number,
  ) => Node | Node[] | Fragment | null,*/
): Fragment {
  const children = [];
  for (let i = 0, size = content.childCount; i < size; i++) {
    const node = content.child(i);
    const transformed = node.isLeaf
      ? callback(node, parent, i)
      : callback(
          node.copy(mapFragment(node.content, callback, node)),
          parent,
          i,
        );
    if (transformed) {
      if (transformed instanceof Fragment) {
        children.push(...getFragmentBackingArray(transformed));
      } else if (Array.isArray(transformed)) {
        children.push(...transformed);
      } else {
        children.push(transformed);
      }
    }
  }
  return Fragment.fromArray(children);
}

export function getFragmentBackingArray(fragment: Fragment) {
  return fragment.content;
}

// Helper function to get a node type from the schema
// Will throw if the node type is not found
export function getNodeType(schema: Schema, name: string): NodeType {
  const nodeType = schema.nodes[name];
  if (!nodeType) {
    throw new Error(`Node type "${name}" not found in schema`);
  }
  return nodeType;
}

// Helper function to get a mark type from the schema
// Will throw if the mark type is not found
export function getMarkType(schema: Schema, name: string): MarkType {
  const markType = schema.marks[name];
  if (!markType) {
    throw new Error(`Mark type "${name}" not found in schema`);
  }
  return markType;
}

export const defaultGetParagraphNodeType = (schema: Schema): NodeType => {
  const nodeType = schema.nodes.paragraph;
  if (!nodeType) {
    throw new Error('Paragraph node type not found in schema');
  }
  return nodeType;
};
