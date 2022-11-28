import type { DesignTokens } from './design-tokens';

export interface BangleThemeInput {
  name: `${string}-dark` | `${string}-light`;
  breakpoints?: DesignTokens['breakpoints'];
  typography?: {
    fontFamily?: DesignTokens['typography']['fontFamily'];
    fontWeight?: DesignTokens['typography']['fontWeight'];
    text?: DesignTokens['typography']['text'];
  };

  radius?: DesignTokens['radius'];
  shadows?: DesignTokens['border']['shadows'];
  border: {
    width?: DesignTokens['border']['width'];
    color: {
      focus?: string;
      neutral: string;
      brandAccent: string;
      promote: string;
      neutralInverted: string;

      // the 4
      caution: string;
      critical: string;
      info: string;
      positive: string;
    };
  };

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
