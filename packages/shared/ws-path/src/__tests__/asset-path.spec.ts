import { describe, expect, it } from 'vitest';
import {
  getEmbeddableWorkspaceAssetKind,
  isEmbeddableWorkspaceAsset,
  relativeMarkdownAssetHref,
  resolveLocalMarkdownAsset,
  resolveWorkspaceMarkdownAssetReference,
  resolveWorkspaceMarkdownAssetReferenceCandidates,
  workspaceRootMarkdownAssetHref,
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

describe('embeddable workspace assets', () => {
  it.each([
    'workspace:assets/image.png',
    'workspace:assets/image.JPG',
    'workspace:assets/diagram.svg',
    'workspace:assets/animation.webp',
  ])('treats image path %s as embeddable', (wsPath) => {
    expect(isEmbeddableWorkspaceAsset(wsPath)).toBe(true);
    expect(getEmbeddableWorkspaceAssetKind(wsPath)).toBe('image');
  });

  it.each([
    'workspace:assets/report.pdf',
    'workspace:notes/current.md',
    'workspace:assets/archive.zip',
    'workspace:assets/',
    'not a ws path',
  ])('does not treat %s as embeddable', (wsPath) => {
    expect(isEmbeddableWorkspaceAsset(wsPath)).toBe(false);
    expect(getEmbeddableWorkspaceAssetKind(wsPath)).toBeUndefined();
  });

  it('creates workspace-root Markdown hrefs', () => {
    expect(
      workspaceRootMarkdownAssetHref('workspace:assets/My Image.png'),
    ).toBe('/assets/My%20Image.png');
    expect(workspaceRootMarkdownAssetHref('workspace:assets/')).toBeUndefined();
  });

  it.each([
    ['assets/image.png', 'workspace:notes/deep/assets/image.png'],
    ['/assets/image.png', 'workspace:assets/image.png'],
    ['workspace:assets/image.png', 'workspace:assets/image.png'],
  ])('resolves copied asset reference %s', (target, expected) => {
    expect(
      resolveWorkspaceMarkdownAssetReference(
        'workspace:notes/deep/current.md',
        target,
      )?.wsPath,
    ).toBe(expected);
  });

  it('includes a workspace-root fallback for copied file-tree paths', () => {
    expect(
      resolveWorkspaceMarkdownAssetReferenceCandidates(
        'workspace:docs/getting-started/quick-start.md',
        'docs/getting-started/codex-prerequisites.md',
      ).map((candidate) => candidate.wsPath),
    ).toEqual([
      'workspace:docs/getting-started/docs/getting-started/codex-prerequisites.md',
      'workspace:docs/getting-started/codex-prerequisites.md',
    ]);
  });

  it('deduplicates references that resolve to the same local and root path', () => {
    expect(
      resolveWorkspaceMarkdownAssetReferenceCandidates(
        'workspace:source.md',
        'assets/photo.png',
      ).map((candidate) => candidate.wsPath),
    ).toEqual(['workspace:assets/photo.png']);
  });

  it('rejects copied wsPaths from another workspace', () => {
    expect(
      resolveWorkspaceMarkdownAssetReference(
        'workspace:notes/current.md',
        'other:assets/image.png',
      ),
    ).toBeUndefined();
  });
});
