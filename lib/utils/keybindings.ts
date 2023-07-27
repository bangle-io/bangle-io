import { isMac } from '@bangle.io/config';

// const altInMac = '⌥'; // option

export function keyDisplayValue(key: string): string {
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
  key: string;
  constructor({ key }: { key: string }) {
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
