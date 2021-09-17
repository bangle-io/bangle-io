import { PluginKey } from '@bangle.dev/pm';

export const extensionName = 'note-tags';
export const paletteMarkName = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey(extensionName + '-key');
export const tagNodeName = 'tag';
export const BANNED_CHARS = '#!$%^&*()+|~=`{}[]:";\'<>?,.\\@';
// TODO fix negative safari support
export const MARKDOWN_REGEX =
  // Make that negative lookahead and negative lookbehind have the same chars which are the same as BANNED_CHARS
  // ALLOWED_CHARS are `\w`, `/ and `-`
  //  NOT  PRECEDED by ALLOWED_CHARS & BANNED_CHARS <MATCH> NOT FOLLOWED by ALLOWED_CHARS & BANNED_CHARS
  /(?<![\w-/#!$%^&*()+|~=`{}\[\]:";\'<>?,.\\@])#\w[\w-/]*(?![\w-/#!$%^&*()+|~=`{}\[\]:";\'<>?,.\\@])/g;
export const TRIGGER = '#';
