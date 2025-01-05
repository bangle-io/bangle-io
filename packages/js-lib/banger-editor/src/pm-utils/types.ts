import type { Fragment, NodeType, PMNode, PMPlugin, Schema } from '../pm';

export type NodeWithPos = {
  pos: number;
  node: PMNode;
};

export type ContentNodeWithPos = {
  start: number;
  depth: number;
} & NodeWithPos;

export type DomAtPos = (pos: number) => { node: Node; offset: number };
export type FindPredicate = (node: PMNode) => boolean;

export type Predicate = FindPredicate;
export type FindResult = ContentNodeWithPos | undefined;

export type NodeTypeParam = NodeType | Array<NodeType>;
export type Content = PMNode | Fragment;

export type KeyCode = string | false;

export type PluginContext = {
  schema: Schema;
};

// Factory type for ProseMirror plugins
export type PluginFactory = (options: {
  schema: Schema;
}) => PMPlugin | PMPlugin[] | null;
