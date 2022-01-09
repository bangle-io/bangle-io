import { PluginKey } from '@bangle.dev/pm';

import { makeSafeForCSS } from '@bangle.io/utils';

export const extensionName = '@bangle.io/inline-command-palette';
export const paletteMarkName = makeSafeForCSS(extensionName + '/paletteMark');
export const palettePluginKey = new PluginKey(extensionName + '-key');
