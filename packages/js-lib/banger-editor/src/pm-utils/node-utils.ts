import type { Attrs, MarkType, NodeType, PMNode } from '../pm';

type FindChildrenAttrsPredicate = (attrs: Attrs) => boolean;
type FindNodesResult = Array<{ node: PMNode; pos: number }>;
type FindChildrenPredicate = (node: PMNode) => boolean;

// Flattens descendants of a given `node`.
export const flatten = (node: PMNode, descend = true): FindNodesResult => {
  if (!node) {
    throw new Error('Invalid "node" parameter');
  }
  const result: FindNodesResult = [];
  node.descendants((child, pos) => {
    result.push({ node: child, pos });
    if (!descend) {
      return false;
    }
    return;
  });
  return result;
};

// Iterates over descendants of a given `node`, returning child nodes predicate returns truthy for.
export const findChildren = (
  node: PMNode,
  predicate: FindChildrenPredicate,
  descend = true,
): FindNodesResult => {
  if (!node) {
    throw new Error('Invalid "node" parameter');
  }
  if (!predicate) {
    throw new Error('Invalid "predicate" parameter');
  }
  return flatten(node, descend).filter((child) => predicate(child.node));
};

// Returns text nodes of a given `node`.
export const findTextNodes = (
  node: PMNode,
  descend = true,
): FindNodesResult => {
  return findChildren(node, (child) => child.isText, descend);
};

// Returns inline nodes of a given `node`.
export const findInlineNodes = (
  node: PMNode,
  descend = true,
): FindNodesResult => {
  return findChildren(node, (child) => child.isInline, descend);
};

// Returns block descendants of a given `node`.
export const findBlockNodes = (
  node: PMNode,
  descend = true,
): FindNodesResult => {
  return findChildren(node, (child) => child.isBlock, descend);
};

// Iterates over descendants of a given `node`, returning child nodes predicate returns truthy for.
export const findChildrenByAttr = (
  node: PMNode,
  predicate: FindChildrenAttrsPredicate,
  descend = true,
): FindNodesResult => {
  return findChildren(node, (child) => !!predicate(child.attrs), descend);
};

// Iterates over descendants of a given `node`, returning child nodes of a given nodeType.
export const findChildrenByType = (
  node: PMNode,
  nodeType: NodeType,
  descend = true,
): FindNodesResult => {
  return findChildren(node, (child) => child.type === nodeType, descend);
};

// Iterates over descendants of a given `node`, returning child nodes that have a mark of a given markType.
export const findChildrenByMark = (
  node: PMNode,
  markType: MarkType,
  descend = true,
): FindNodesResult => {
  return findChildren(
    node,
    (child) => Boolean(markType.isInSet(child.marks)),
    descend,
  );
};

// Returns `true` if a given node contains nodes of a given `nodeType`
export const contains = (node: PMNode, nodeType: NodeType): boolean => {
  return !!findChildrenByType(node, nodeType).length;
};
