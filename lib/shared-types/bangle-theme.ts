import type { DesignTokens } from './design-tokens';

export interface BangleThemeInput {
  name: `${string}-dark` | `${string}-light`;
  widescreenWidth?: DesignTokens['widescreenWidth'];
  typography?: {
    fontFamily?: DesignTokens['typography']['fontFamily'];
    text?: DesignTokens['typography']['text'];
  };

  ringWidth?: DesignTokens['ringWidth'];
  border?: Partial<DesignTokens['border']>;

  foregroundColor: DesignTokens['color']['foreground'];

  backgroundColor: {
    body: string;

    surface: string;
    surfaceDark: string;

    brand: string;

    brandAccent: string;
    brandAccentLight: string;

    neutral: string;
    neutralLight: string;

    neutralSoft: string;

    // the 4
    caution: string;
    cautionLight: string;
    critical: string;
    criticalLight: string;
    info: string;
    infoLight: string;
    positive: string;
    positiveLight: string;
  };
}
