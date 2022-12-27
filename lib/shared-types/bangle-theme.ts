import type { DesignTokens } from './design-tokens';

type RecursivePartial<T> = {
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

// {
//   typography?: Partial<{
//     fontFamily?: Partial<DesignTokens['typography']['fontFamily']>;
//     text?: Partial<DesignTokens['typography']['text']>;
//   }>;

//   ringWidth?: Partial<DesignTokens['ringWidth']>;
//   border?: TwoLevelPartial<DesignTokens['border']>;
//   misc?: Partial<DesignTokens['misc']>;
// };

export type BangleThemeInput =
  | BangleThemeInputLightDark
  | BangleThemeInputSingle;

export type BangleThemeInputLightDark = RecursivePartial<ThemeBase> & {
  color?: {
    light?: RecursivePartial<DesignTokens['color']>;
    dark?: RecursivePartial<DesignTokens['color']>;
  };
};

export type BangleThemeInputSingle = RecursivePartial<ThemeBase> & {
  color?: RecursivePartial<DesignTokens['color']>;
};
