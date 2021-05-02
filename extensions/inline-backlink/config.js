import { PluginKey } from '@bangle.dev/core/prosemirror/state';

export const extensionName = 'inline-backlink';
export const backLinkNodeName = 'wikiLink';
export const paletteMark = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey('inlineBacklinkPlatteKey');
