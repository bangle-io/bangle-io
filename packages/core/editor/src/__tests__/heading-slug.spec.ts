import { describe, expect, it } from 'vitest';
import { findHeadingIndexBySlug } from '../heading-slug';

describe('findHeadingIndexBySlug', () => {
  const headings = [
    'Introduction',
    'Heading with punctuation!',
    'Unicode 😀 heading',
    'Repeated heading',
    'Repeated heading',
    'Repeated heading',
  ];

  it.each([
    ['introduction', 0],
    ['heading-with-punctuation', 1],
    ['unicode--heading', 2],
    ['repeated-heading', 3],
    ['repeated-heading-1', 4],
    ['repeated-heading-2', 5],
  ])('matches GitHub slug %j', (fragment, expected) => {
    expect(findHeadingIndexBySlug(headings, fragment)).toBe(expected);
  });

  it('does not match unknown or differently-cased slugs', () => {
    expect(findHeadingIndexBySlug(headings, 'missing')).toBeUndefined();
    expect(findHeadingIndexBySlug(headings, 'Introduction')).toBeUndefined();
  });
});
