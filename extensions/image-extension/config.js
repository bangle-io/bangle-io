import { PluginKey } from '@bangle.dev/pm';

export const IMAGE_SAVE_DIR = 'assets/images';
export const menuKey = new PluginKey('imageMenuKey');
// TODO I need a better solution to access
// app contexts from inside of a pm plugin
export const wsNameViewWeakStore = new WeakMap();
