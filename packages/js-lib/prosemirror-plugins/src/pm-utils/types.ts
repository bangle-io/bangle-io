import type { Mark, MarkSpec } from '@prosekit/pm/model';
import type { Fragment, NodeType, Node as PMNode } from '@prosekit/pm/model';
import type { AttrSpec } from 'prosekit/core';

export type Attrs = {
  readonly [attr: string]: any;
};

export interface MarkSpecOptions<
  TMarkName extends string = string,
  TAttrs extends Attrs = Record<string, any>,
> extends MarkSpec {
  name: TMarkName;
  attrs?: { [K in keyof TAttrs]: AttrSpec<TAttrs[K]> };
}

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
