import { isMac } from './is-mac';

const isFirefox =
  typeof navigator != 'undefined'
    ? navigator.userAgent?.toLocaleLowerCase()?.indexOf('firefox') > -1
    : false;
const altInMac = '⌥'; // option

export function keyDisplayValue(key) {
  if (key.includes('Mod')) {
    key = key.split('Mod').join(isMac ? '⌘' : 'Ctrl');
  }

  key = key
    .split('-')
    .map((r) => {
      if (/^[A-Z]$/.test(r)) {
        return `Shift-${r.toLocaleLowerCase()}`;
      }
      return r;
    })
    .join('-');

  if (key.includes('Shift')) {
    key = key.split('Shift').join('⇧');
  }
  return key;
}

class KeyBinding {
  constructor({ key }) {
    this.key = key;
  }
  get displayValue() {
    return keyDisplayValue(this.key);
  }
}

export const keybindings = {
  toggleSecondaryEditor: new KeyBinding({
    key: 'Mod-\\',
  }),
  toggleCommandPalette: new KeyBinding({
    key: isFirefox ? 'Mod-o' : 'Mod-P',
  }),
  toggleFilePalette: new KeyBinding({
    key: 'Mod-p',
  }),
  toggleWorkspacePalette: new KeyBinding({
    key: 'Ctrl-r',
  }),
  toggleNoteBrowser: new KeyBinding({
    key: 'Mod-e',
  }),
  toggleInlineCommandPalette: new KeyBinding({
    key: 'Mod-/',
  }),
  newNote: new KeyBinding({
    key: 'Ctrl-n',
  }),
  searchNotes: new KeyBinding({
    key: 'Mod-F',
  }),
};
