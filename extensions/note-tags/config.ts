import { PluginKey } from '@bangle.dev/pm';
export const extensionName = 'note-tags';
export const paletteMarkName = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey(extensionName + '-key');
export const tagNodeName = 'tag';
export const BANNED_CHARS = '#!$%^&*()+|~=`{}[]:";\'<>?,.@\\';

export const TRIGGER = '#';

//  NOTE this regex is just for safari and it doesn't work that well
//  the correct regex for tags is in the try catch
//  We have this shitty hack because safari doesnt support look-behinds
//  and I donot have time to figure out doing this without lookbehind
let regex = /(?:^|\s+)(#\w[\w-/]*)(?![\w-/#!$%^&*()+|~=`{}\[\]:";\'<>?,.\\@])/g;
let inferiorRegex = false;
try {
  regex = new RegExp(
    '(?<![\\w-/#!$%^&*()+|~=`{}\\[\\]:";\\\'<>?,.\\\\@])#\\w[\\w-/]*(?![\\w-/#!$%^&*()+|~=`{}\\[\\]:";\\\'<>?,.\\\\@])',
    'g',
  );
} catch (e) {
  // this fails in safari since it doesn't support look-behinds
  if (
    e.message === 'Invalid regular expression: invalid group specifier name'
  ) {
    inferiorRegex = true;
  } else {
    throw e;
  }
}

export const MARKDOWN_REGEX = regex;
export const USING_INFERIOR_REGEX = inferiorRegex;
