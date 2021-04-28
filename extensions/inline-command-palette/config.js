import { PluginKey } from '@bangle.dev/core/prosemirror/state';

export const extensionName = 'inline-command-palette';
export const paletteMarkName = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey(extensionName + '-key');
