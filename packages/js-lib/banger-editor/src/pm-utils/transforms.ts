import type { Attrs, Mark, NodeType } from '../pm';
import { Fragment, PMNode } from '../pm';
import { NodeSelection, PMSelection, type Transaction } from '../pm';

import {
  canInsert,
  cloneTr,
  isEmptyParagraph,
  isNodeSelection,
  removeNodeAtPos,
  replaceNodeAtPos,
} from './helpers';
import { findParentNodeOfType, findPositionOfNodeBefore } from './selection';
import type { Content, NodeTypeParam } from './types';

// Removes a node of a given `nodeType`.
export const removeParentNodeOfType =
  (nodeType: NodeTypeParam) =>
  (tr: Transaction): Transaction => {
    const parent = findParentNodeOfType(nodeType)(tr.selection);
    if (parent) {
      return removeNodeAtPos(parent.pos)(tr);
    }
    return tr;
  };

// Replaces parent node of a given `nodeType` with the given `content`.
export const replaceParentNodeOfType =
  (nodeType: NodeTypeParam, content: Content) =>
  (tr: Transaction): Transaction => {
    if (!Array.isArray(nodeType)) {
      // biome-ignore lint/style/noParameterAssign: <explanation>
      nodeType = [nodeType];
    }
    for (let i = 0, count = nodeType.length; i < count; i++) {
      const childNodeType = nodeType[i];
      if (!childNodeType) {
        continue;
      }

      const parent = findParentNodeOfType(childNodeType)(tr.selection);
      if (parent) {
        const newTr = replaceNodeAtPos(parent.pos, content)(tr);
        if (newTr !== tr) {
          return newTr;
        }
      }
    }
    return tr;
  };

// Removes selected node.
export const removeSelectedNode = (tr: Transaction): Transaction => {
  if (isNodeSelection(tr.selection)) {
    const from = tr.selection.$from.pos;
    const to = tr.selection.$to.pos;
    return cloneTr(tr.delete(from, to));
  }
  return tr;
};

// Replaces selected node with a given `content`.
export const replaceSelectedNode =
  (content: Content) =>
  (tr: Transaction): Transaction => {
    if (isNodeSelection(tr.selection)) {
      const { $from, $to } = tr.selection;
      if (
        (content instanceof Fragment &&
          $from.parent.canReplace(
            $from.index(),
            $from.indexAfter(),
            content,
          )) ||
        (content instanceof PMNode &&
          $from.parent.canReplaceWith(
            $from.index(),
            $from.indexAfter(),
            content.type,
          ))
      ) {
        return cloneTr(
          tr
            .replaceWith($from.pos, $to.pos, content)
            .setSelection(new NodeSelection(tr.doc.resolve($from.pos))),
        );
      }
    }
    return tr;
  };

// Sets a text selection from the given position, searching in the specified direction.
export const setTextSelection =
  (position: number, dir = 1) =>
  (tr: Transaction): Transaction => {
    const nextSelection = PMSelection.findFrom(
      tr.doc.resolve(position),
      dir,
      true,
    );
    if (nextSelection) {
      return tr.setSelection(nextSelection);
    }
    return tr;
  };

const isSelectableNode = (node: Content): node is PMNode =>
  Boolean(node instanceof PMNode && node.type && node.type.spec.selectable);
const shouldSelectNode = (node: Content): boolean =>
  isSelectableNode(node) && node.type.isLeaf;

const setSelection = (
  node: Content,
  pos: number,
  tr: Transaction,
): Transaction => {
  if (shouldSelectNode(node)) {
    return tr.setSelection(new NodeSelection(tr.doc.resolve(pos)));
  }
  return setTextSelection(pos)(tr);
};

// Inserts a given `content` at the current cursor position, or at a given `position`.
export const safeInsert =
  (content: Content, position?: number, tryToReplace?: boolean) =>
  (tr: Transaction): Transaction => {
    const hasPosition = typeof position === 'number';
    const { $from } = tr.selection;
    const $insertPos = hasPosition
      ? tr.doc.resolve(position)
      : isNodeSelection(tr.selection)
        ? tr.doc.resolve($from.pos + 1)
        : $from;
    const { parent } = $insertPos;

    if (isNodeSelection(tr.selection) && tryToReplace) {
      const oldTr = tr;
      // biome-ignore lint/style/noParameterAssign: <explanation>
      tr = replaceSelectedNode(content)(tr);
      if (oldTr !== tr) {
        return tr;
      }
    }

    if (isEmptyParagraph(parent)) {
      const oldTr = tr;
      // biome-ignore lint/style/noParameterAssign: <explanation>
      tr = replaceParentNodeOfType(parent.type, content)(tr);
      if (oldTr !== tr) {
        const pos = isSelectableNode(content)
          ? $insertPos.before($insertPos.depth)
          : $insertPos.pos;
        return setSelection(content, pos, tr);
      }
    }

    if (canInsert($insertPos, content)) {
      tr.insert($insertPos.pos, content);
      const pos = hasPosition
        ? $insertPos.pos
        : isSelectableNode(content)
          ? tr.selection.$anchor.pos - 1
          : tr.selection.$anchor.pos;
      return cloneTr(setSelection(content, pos, tr));
    }

    for (let i = $insertPos.depth; i > 0; i--) {
      const pos = $insertPos.after(i);
      const $pos = tr.doc.resolve(pos);
      if (canInsert($pos, content)) {
        tr.insert(pos, content);
        return cloneTr(setSelection(content, pos, tr));
      }
    }
    return tr;
  };

// Changes the type, attributes, and/or marks of the parent node of a given `nodeType`.
export const setParentNodeMarkup =
  (
    nodeType: NodeTypeParam,
    type: NodeType | null,
    attrs?: Attrs | null,
    marks?: Array<Mark> | ReadonlyArray<Mark>,
  ) =>
  (tr: Transaction): Transaction => {
    const parent = findParentNodeOfType(nodeType)(tr.selection);
    if (parent) {
      return cloneTr(
        tr.setNodeMarkup(
          parent.pos,
          type,
          Object.assign({}, parent.node.attrs, attrs),
          marks,
        ),
      );
    }
    return tr;
  };

// Sets a `NodeSelection` on a parent node of a `given nodeType`.
export const selectParentNodeOfType =
  (nodeType: NodeTypeParam) =>
  (tr: Transaction): Transaction => {
    if (!isNodeSelection(tr.selection)) {
      const parent = findParentNodeOfType(nodeType)(tr.selection);
      if (parent) {
        return cloneTr(
          tr.setSelection(NodeSelection.create(tr.doc, parent.pos)),
        );
      }
    }
    return tr;
  };

// Deletes previous node.
export const removeNodeBefore = (tr: Transaction): Transaction => {
  const position = findPositionOfNodeBefore(tr.selection);
  if (typeof position === 'number') {
    return removeNodeAtPos(position)(tr);
  }
  return tr;
};
