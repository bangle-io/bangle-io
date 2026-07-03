import { describe, expect, it } from 'vitest';
import {
  relativeMarkdownAssetHref,
  resolveLocalMarkdownAsset,
} from '../asset-path';

describe('resolveLocalMarkdownAsset', () => {
  const current = 'workspace:notes/deep/current.md';

  it.each([
    ['assets/image.png', 'workspace:notes/deep/assets/image.png'],
    ['./assets/image.png', 'workspace:notes/deep/assets/image.png'],
    ['../shared/file.pdf', 'workspace:notes/shared/file.pdf'],
    ['/root%20asset.png', 'workspace:root asset.png'],
    ['encoded%20space.png', 'workspace:notes/deep/encoded space.png'],
    ['../sibling/readme.md', 'workspace:notes/sibling/readme.md'],
  ])('resolves %s', (href, expected) => {
    expect(resolveLocalMarkdownAsset(current, href)?.wsPath).toBe(expected);
  });

  it.each([
    '../../../escape.png',
    'assets/%2Fsecret.png',
    'assets%2Fsecret.png',
    'assets\\secret.png',
    'https://example.com/file.png',
    'data:image/png;base64,abc',
    'blob:https://example.com/abc',
    'file.png?download=1',
    'file.png#fragment',
    'bad%ZZ.png',
    '',
  ])('rejects unsafe target %j', (href) => {
    expect(resolveLocalMarkdownAsset(current, href)).toBeUndefined();
  });
});

describe('relativeMarkdownAssetHref', () => {
  it.each([
    ['workspace:note.md', 'workspace:assets/file.png', 'assets/file.png'],
    [
      'workspace:notes/current.md',
      'workspace:notes/assets/file name.png',
      'assets/file%20name.png',
    ],
    [
      'workspace:notes/deep/current.md',
      'workspace:notes/shared/file.pdf',
      '../shared/file.pdf',
    ],
    [
      'workspace:notes/current.md',
      'workspace:root asset.png',
      '../root%20asset.png',
    ],
    ['workspace:notes/current.md', 'other:notes/file.pdf', undefined],
  ])('creates href from %s to %s', (source, asset, expected) => {
    expect(relativeMarkdownAssetHref(source, asset)).toBe(expected);
  });
});
