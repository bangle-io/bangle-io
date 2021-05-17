// TODO this exporting is unfortunate but I need
// this to get commands decoupled from this module
export * from 'config/paletteTypes';

export class PaletteTypeBase {
  static type;
  static identifierPrefix;
  static description;
  static PaletteIcon;
  static UIComponent;
  static placeholder;
  static keybinding;

  // If this palette wants to handle the rawQuery
  // it must return a string type which represets the parsed
  // version of the raw input from user. Return null
  // to let other palette handle the query.
  static parseRawQuery(rawQuery) {
    if (this.identifierPrefix && rawQuery.startsWith(this.identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  }
}
