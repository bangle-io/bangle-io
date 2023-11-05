import type { DesignTokens } from '@bangle.io/shared-types';

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

export type BangleMiscTokens = RecursivePartial<DesignTokens['misc']>;
