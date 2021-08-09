import { PluginKey } from '@bangle.dev/pm';

export const extensionName = 'note-tags';
export const paletteMarkName = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey(extensionName + '-key');
export const tagNodeName = 'tag';
export const BANNED_CHARS = '#!$%^&*()+|~=`{}[]:";\'<>?,.\\@';
export const MARKDOWN_REGEX =
  /(?<![\w#!$%^&*()+|~=`{}\[\]:";\'<>?,.\\@])#\w+[^\s#!$%^&*()+|~=`{}\[\]:";\'<>?,.\\@]*/g;
