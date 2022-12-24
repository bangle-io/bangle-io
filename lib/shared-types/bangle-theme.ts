import type { DesignTokens } from './design-tokens';

export type BangleThemeColorInput = NestedPartial<DesignTokens['color']>;
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

type NestedPartial<ObjectType extends object> = {
  [KeyType in keyof ObjectType]?: ObjectType[KeyType] extends object
    ? Partial<ObjectType[KeyType]>
    : ObjectType[KeyType];
};
