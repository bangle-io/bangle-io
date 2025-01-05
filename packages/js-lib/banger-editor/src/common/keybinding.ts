import { type Command, type Plugin, keymap } from '../pm';
import { setPluginPriority } from './collection';
import { getGlobalConfig } from './global-config';

// use false to disable a keybinding
export function keybinding(
  keys: Array<[string | false, Command]> | Record<string, Command>,
  name: string,
  priority?: number,
  debug = getGlobalConfig().debug,
): Plugin {
  const normalizedKeys = Array.isArray(keys) ? keys : Object.entries(keys);

  const object = Object.fromEntries(
    normalizedKeys
      .filter((param): param is [string, Command] => !!param[0])
      .map(([key, command]): [string, Command] => [
        key,
        !debug
          ? command
          : (...args) => {
              const result = command(...args);

              // to avoid logging non shortcut keys
              if (key.length > 1) {
                if (result !== false) {
                  console.log(`✅ "${name}" handled keypress "${key}"`);
                } else {
                  console.log(`❌ "${name}" did not handle keypress "${key}"`);
                }
              }
              return result;
            },
      ]),
  );

  const plugin = keymap(object);

  if (typeof priority === 'number') {
    setPluginPriority(plugin, priority, name);
  }

  return plugin;
}
