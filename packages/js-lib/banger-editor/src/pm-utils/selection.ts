import { type PMNode, type ResolvedPos, TextSelection } from '../pm';
import { PMSelection } from '../pm';

import { equalNodeType, isNodeSelection } from './helpers';
import type {
  DomAtPos,
  FindPredicate,
  FindResult,
  NodeTypeParam,
} from './types';

// Iterates over parent nodes, returning the closest node `predicate` returns truthy for.
export const findParentNode =
  (predicate: FindPredicate) =>
  ({ $from, $to }: PMSelection, validateSameParent = false): FindResult => {
    if (validateSameParent && !$from.sameParent($to)) {
      let depth = Math.min($from.depth, $to.depth);
      while (depth >= 0) {
        const fromNode = $from.node(depth);
        const toNode = $to.node(depth);
        if (toNode === fromNode) {
          if (predicate(fromNode)) {
            return {
              pos: depth > 0 ? $from.before(depth) : 0,
              start: $from.start(depth),
              depth: depth,
              node: fromNode,
            };
          }
        }
        depth = depth - 1;
      }
      return;
    }
    return findParentNodeClosestToPos($from, predicate);
  };

// Iterates over parent nodes starting from the given `$pos`.
export const findParentNodeClosestToPos = (
  $pos: ResolvedPos,
  predicate: FindPredicate,
): FindResult => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node,
      };
    }
  }
  return;
};

// Iterates over parent nodes, returning DOM reference of the closest node `predicate` returns truthy for.
export const findParentDomRef =
  (predicate: FindPredicate, domAtPos: DomAtPos) =>
  (selection: PMSelection): Node | undefined => {
    const parent = findParentNode(predicate)(selection);
    if (parent) {
      return findDomRefAtPos(parent.pos, domAtPos);
    }
    return;
  };

// Checks if there's a parent node `predicate` returns truthy for.
export const hasParentNode =
  (predicate: FindPredicate) =>
  (selection: PMSelection): boolean => {
    return !!findParentNode(predicate)(selection);
  };

// Iterates over parent nodes, returning closest node of a given `nodeType`.
export const findParentNodeOfType =
  (nodeType: NodeTypeParam) =>
  (selection: PMSelection): FindResult => {
    return findParentNode((node) => equalNodeType(nodeType, node))(selection);
  };

// Iterates over parent nodes starting from the given `$pos`, returning closest node of a given `nodeType`.
export const findParentNodeOfTypeClosestToPos = (
  $pos: ResolvedPos,
  nodeType: NodeTypeParam,
): FindResult => {
  return findParentNodeClosestToPos($pos, (node: PMNode) =>
    equalNodeType(nodeType, node),
  );
};

// Checks if there's a parent node of a given `nodeType`.
export const hasParentNodeOfType =
  (nodeType: NodeTypeParam) =>
  (selection: PMSelection): boolean => {
    return hasParentNode((node) => equalNodeType(nodeType, node))(selection);
  };

// Iterates over parent nodes, returning DOM reference of the closest node of a given `nodeType`.
export const findParentDomRefOfType =
  (nodeType: NodeTypeParam, domAtPos: DomAtPos) =>
  (selection: PMSelection): Node | undefined => {
    return findParentDomRef(
      (node) => equalNodeType(nodeType, node),
      domAtPos,
    )(selection);
  };

// Returns a node of a given `nodeType` if it is selected.
export const findSelectedNodeOfType =
  (nodeType: NodeTypeParam) =>
  (selection: PMSelection): FindResult | undefined => {
    if (isNodeSelection(selection)) {
      const { node, $from } = selection;
      if (equalNodeType(nodeType, node)) {
        return {
          node,
          start: $from.start(),
          pos: $from.pos,
          depth: $from.depth,
        };
      }
    }
    return;
  };

// Returns position of the previous node.
export const findPositionOfNodeBefore = (
  selection: PMSelection,
): number | undefined => {
  const { nodeBefore } = selection.$from;
  const maybeSelection = PMSelection.findFrom(selection.$from, -1);
  if (maybeSelection && nodeBefore) {
    const parent = findParentNodeOfType(nodeBefore.type)(maybeSelection);
    if (parent) {
      return parent.pos;
    }
    return maybeSelection.$from.pos;
  }
  return;
};

// Returns DOM reference of a node at a given `position`.
export const findDomRefAtPos = (position: number, domAtPos: DomAtPos): Node => {
  const dom = domAtPos(position);
  const node = dom.node.childNodes[dom.offset];

  if (dom.node.nodeType === Node.TEXT_NODE && dom.node.parentNode) {
    return dom.node.parentNode;
  }

  if (!node || node.nodeType === Node.TEXT_NODE) {
    return dom.node;
  }

  return node;
};

export function isTextSelection(
  selection: PMSelection,
): selection is TextSelection {
  return selection instanceof TextSelection;
}
