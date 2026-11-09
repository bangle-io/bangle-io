import { Mark } from 'wordgard/doc';
import { BulletList, OrderedList } from 'wordgard/types';

/**
 * Markdown list tightness retained on the real Wordgard list wrapper.
 * Absence means tight so lists created by editing commands default to tight.
 */
export const ListTight = Mark.Type.define<boolean>('ListTight', {
  target: [BulletList, OrderedList],
  keepOnSplit: true,
  keepOnTypeChange: true,
  validate: 'boolean',
  shape: {
    attribute: 'data-list-tight',
    value: (tight) => String(tight),
  },
});
