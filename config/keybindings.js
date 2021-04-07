import { isMac } from './is-mac';

const altInMac = '⌥'; // option

class KeyBinding {
  constructor({ key }) {
    this.key = key;
  }
  get displayValue() {
    let key = this.key;
    if (key.includes('Mod')) {
      key = key.split('Mod').join(isMac ? '⌘' : 'Ctrl');
    }
    return key;
  }
}

export const keybindings = {
  toggleSecondaryEditor: new KeyBinding({
    key: 'Mod-\\',
  }),
  toggleCommandPalette: new KeyBinding({
    key: 'Mod-P',
  }),
  toggleFilePalette: new KeyBinding({
    key: 'Mod-p',
  }),
  toggleWorkspacePalette: new KeyBinding({
    key: 'Ctrl-r',
  }),
};
