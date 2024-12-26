import type { AttrSpec } from 'prosekit/core';

import type { Mark, MarkSpec } from '@prosekit/pm/model';

type Attrs = {
  readonly [attr: string]: any;
};

export interface MarkSpecOptions<
  TMarkName extends string = string,
  TAttrs extends Attrs = Record<string, any>,
> extends MarkSpec {
  name: TMarkName;
  attrs?: { [K in keyof TAttrs]: AttrSpec<TAttrs[K]> };
}
