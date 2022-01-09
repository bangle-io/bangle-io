import { PluginKey } from '@bangle.dev/pm';

import { makeSafeForCSS } from '@bangle.io/utils';

export const extensionName = '@bangle.io/note-tags';
export const paletteMarkName = makeSafeForCSS(extensionName + '-paletteMark');
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
} catch (error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  // this fails in safari since it doesn't support look-behinds
  if (
    error.message === 'Invalid regular expression: invalid group specifier name'
  ) {
    inferiorRegex = true;
  } else {
    throw error;
  }
}

export const MARKDOWN_REGEX = regex;
export const USING_INFERIOR_REGEX = inferiorRegex;
