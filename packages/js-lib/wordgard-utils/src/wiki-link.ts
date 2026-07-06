import { Leaf, Mark } from 'wordgard/doc';

/**
 * A `[[wiki link]]` — an atomic inline leaf whose string parameter is the link
 * target (the linked note). The optional display label (`[[target|label]]`)
 * is the {@link WikiLinkLabel} mark, following Wordgard's one-param-plus-marks
 * model. Target resolution and navigation are app concerns and live in
 * `editor-w`, not here.
 */
export const WikiLink: Leaf.Type<string> = Leaf.Type.define<string>(
  'WikiLink',
  {
    inline: true,
    validate: 'string',
    selectable: true,
    toText: (leaf) => {
      const label = leaf.mark(WikiLinkLabel);
      return typeof label === 'string' ? label : String(leaf.param);
    },
    shape: {
      element: 'a',
      selector: 'a[data-wiki-link-target]',
      attributes: (target) => ({ 'data-wiki-link-target': target }),
      readElement: (elt) => elt.getAttribute('data-wiki-link-target') ?? '',
    },
  },
);

/**
 * Optional display label for a {@link WikiLink} (`[[target|label]]`).
 */
export const WikiLinkLabel: Mark.Type<string> = Mark.Type.define<string>(
  'WikiLinkLabel',
  {
    target: WikiLink,
    validate: 'string',
    shape: { attribute: 'data-wiki-link-label', value: 0 },
  },
);
