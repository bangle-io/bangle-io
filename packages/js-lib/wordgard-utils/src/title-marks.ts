import { Mark } from 'wordgard/doc';
import { Image, Link } from 'wordgard/types';

/**
 * The optional Markdown link title — the quoted part of `[text](href "title")`.
 * The built-in {@link Link} mark's parameter carries only the href, so the
 * title travels as a sibling mark applied to the same inline nodes. It exists
 * purely to preserve Markdown fidelity for notes that use link titles.
 */
export const LinkTitle = Mark.Type.define<string>('LinkTitle', {
  validate: 'string',
  shape: { attribute: 'data-link-title', value: 0 },
});

/**
 * The optional Markdown image title — the quoted part of
 * `![alt](src "title")`. Like {@link LinkTitle}, kept as a mark on the
 * {@link Image} leaf (whose parameter is the src) for Markdown fidelity.
 */
export const ImageTitle = Mark.Type.define<string>('ImageTitle', {
  target: Image,
  validate: 'string',
  shape: { attribute: 'data-image-title', value: 0, preferTarget: 'img' },
});
