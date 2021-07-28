import type { UniversalPalette } from 'ui-components';

export type PaletteReactComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PaletteManagerReactComponentProps> &
    React.RefAttributes<PaletteManagerImperativeHandle>
>;

export interface PaletteManagerReactComponentProps {
  query: string;
  paletteType: string | undefined;
  paletteMetadata: any;
  updatePalette: (type: string, initialQuery?: string, metadata?: any) => void;
  dismissPalette: (focusEditor?: boolean) => void;
  onSelect: ReturnType<typeof UniversalPalette.usePaletteDriver>['onSelect'];
  counter: number;
  getActivePaletteItem: (items) => undefined | UniversalPalette.ItemType;
  updateCounter: ReturnType<
    typeof UniversalPalette.usePaletteDriver
  >['updateCounter'];
}

export type PaletteManagerImperativeHandle = {
  onExecuteItem: UniversalPalette.PaletteOnExecuteItem;
};

export interface ExtensionPaletteType {
  type: string;
  icon: JSX.Element;
  identifierPrefix: string;
  placeholder: string;
  parseRawQuery: (query: string) => string | undefined | null;
  ReactComponent: PaletteReactComponent;
}
