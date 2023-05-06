import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import type { NoteFormatProvider } from '@bangle.io/shared-types';

export const markdownFormatProvider: NoteFormatProvider = {
  name: 'markdown-format-provider',
  description: 'Saves notes in Markdown format',
  extensions: ['md'],

  serializeNote(doc, specRegistry) {
    return markdownSerializer(doc, specRegistry) || '';
  },

  parseNote(value, specRegistry, plugins) {
    return markdownParser(value, specRegistry, plugins);
  },
};
