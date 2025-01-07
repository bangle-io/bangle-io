import { collection, isMac, keybinding } from './common';
import { history, redo, undo } from './pm';

export type HistoryConfig = {
  depth?: number;
  newGroupDelay?: number;
  // keys
  keyUndo?: string | false;
  keyRedo?: string | false;
};

type RequiredConfig = Required<HistoryConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  depth: 100,
  newGroupDelay: 500,
  keyUndo: 'Mod-z',
  keyRedo: isMac ? 'Mod-Shift-z' : 'Mod-y',
};

export function setupHistory(userConfig?: HistoryConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const plugin = {
    history: pluginHistory(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'history',
    plugin,
  });
}

// PLUGINS
function pluginHistory(config: RequiredConfig) {
  return () => {
    const { depth, newGroupDelay } = config;
    return history({
      depth,
      newGroupDelay,
    });
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return () => {
    const { keyUndo, keyRedo } = config;
    return keybinding(
      [
        [keyUndo, undo],
        [keyRedo, redo],
      ],
      'history',
    );
  };
}
