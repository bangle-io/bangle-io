import type { DesignTokens } from './design-tokens';

export type BangleThemeColorInput = DesignTokens['color'];
export interface BangleThemeInput {
  name: string;
  typography?: {
    fontFamily?: DesignTokens['typography']['fontFamily'];
    text?: DesignTokens['typography']['text'];
  };

  ringWidth?: DesignTokens['ringWidth'];
  border?: Partial<DesignTokens['border']>;

  color:
    | BangleThemeColorInput
    | {
        light: BangleThemeColorInput;
        dark: BangleThemeColorInput;
      };
}
