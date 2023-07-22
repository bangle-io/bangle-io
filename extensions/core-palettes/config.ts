import type { CorePalette } from '@bangle.io/constants';
import type { UniversalPalette } from '@bangle.io/ui-components';

export const extensionName = '@bangle.io/core-palettes';

export interface PaletteManagerReactComponentProps {
  query: string;
  paletteType?: string | null;
  paletteMetadata: any;
  updatePalette: (type: CorePalette | undefined, initialQuery?: string) => void;
  dismissPalette: (focusEditor?: boolean) => void;
  onSelect: ReturnType<typeof UniversalPalette.usePaletteDriver>['onSelect'];
  counter: number;
  getActivePaletteItem: (
    items: UniversalPalette.ItemType[],
  ) => undefined | UniversalPalette.ItemType;
  updateCounter: ReturnType<
    typeof UniversalPalette.usePaletteDriver
  >['updateCounter'];
  allPalettes: ExtensionPaletteType[];
}

export type PaletteReactComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PaletteManagerReactComponentProps> &
    React.RefAttributes<PaletteManagerImperativeHandle>
>;

export type PaletteManagerImperativeHandle = {
  onExecuteItem: UniversalPalette.PaletteOnExecuteItem;
};

export interface ExtensionPaletteType {
  type: CorePalette;
  icon: JSX.Element;
  identifierPrefix: string;
  placeholder: string;
  parseRawQuery: (query: string) => string | undefined | null;
  ReactComponent: PaletteReactComponent;
}
