import type { DesignTokens } from './design-tokens';

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

export type ThemeBase = Omit<
  DesignTokens,
  'uid' | 'theme' | 'widescreenWidth' | 'color'
>;

export type BangleThemeInput =
  | BangleThemeInputDualColorScheme
  | BangleThemeInputSingleScheme;

export type BangleThemeInputDualColorScheme = RecursivePartial<ThemeBase> & {
  color?: {
    light?: RecursivePartial<DesignTokens['color']>;
    dark?: RecursivePartial<DesignTokens['color']>;
  };
};

export type BangleThemeInputSingleScheme = RecursivePartial<ThemeBase> & {
  color?: RecursivePartial<DesignTokens['color']>;
};
