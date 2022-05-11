import { PluginKey } from '@bangle.dev/pm';

import { makeSafeForCSS } from '@bangle.io/utils';

export const extensionName = '@bangle.io/inline-backlink';
export const backlinkNodeName = 'wikiLink';
export const paletteMark = makeSafeForCSS(extensionName + '-paletteMark');
export const palettePluginKey = new PluginKey('inlineBacklinkPlatteKey');
export const NEW_NOTE_LOCATION = 'CURRENT_DIR'; // or  WORKSPACE_ROOT
