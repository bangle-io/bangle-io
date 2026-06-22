import { describe, expect, it } from 'vitest';
import { normalizeLinkTarget, resolveInternalLink } from '../link-target';

describe('normalizeLinkTarget', () => {
  it('normalizes web links and preserves relative Markdown paths', () => {
    expect(normalizeLinkTarget('example.com')).toEqual({
      kind: 'external',
      href: 'https://example.com/',
    });
    expect(normalizeLinkTarget(' ../other.md ')).toEqual({
      kind: 'internal',
      href: '../other.md',
    });
    expect(normalizeLinkTarget('/docs/readme.markdown')).toEqual({
      kind: 'internal',
      href: '/docs/readme.markdown',
    });
  });

  it('rejects unsupported schemes, fragments, and malformed links', () => {
    expect(normalizeLinkTarget('javascript:alert(1)')).toBeUndefined();
    expect(normalizeLinkTarget('note.md#heading')).toBeUndefined();
    expect(normalizeLinkTarget('google com')).toBeUndefined();
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///tmp/note.md',
    'ftp://example.com/note.md',
    'mailto:user@example.com',
    'other-workspace:note.md',
    'note.md?redirect=https://example.com',
    'note.md#fragment',
    '',
    '   ',
  ])('rejects unsafe or unsupported target %j', (href) => {
    expect(normalizeLinkTarget(href)).toBeUndefined();
  });

  it.each([
    ['HTTP://EXAMPLE.COM/note.md', 'http://example.com/note.md'],
    ['https://example.com/path', 'https://example.com/path'],
    ['localhost:5173/note', 'https://localhost:5173/note'],
  ])('normalizes external target %j', (href, expected) => {
    expect(normalizeLinkTarget(href)).toEqual({
      kind: 'external',
      href: expected,
    });
  });

  it.each([
    ['note.md', 'note.md'],
    ['./note.md', './note.md'],
    ['../note.markdown', '../note.markdown'],
    ['/root.md', '/root.md'],
    [' notes/child.md ', 'notes/child.md'],
    ['notes%20with%20spaces/note.md', 'notes%20with%20spaces/note.md'],
    ['NOTE.MD', 'NOTE.MD'],
  ])('preserves internal target %j', (href, expected) => {
    expect(normalizeLinkTarget(href)).toEqual({
      kind: 'internal',
      href: expected,
    });
  });
});

describe('resolveInternalLink', () => {
  const current = 'workspace:notes/current.md';

  it.each([
    ['other.md', 'workspace:notes/other.md'],
    ['./child.md', 'workspace:notes/child.md'],
    ['sub/child.markdown', 'workspace:notes/sub/child.markdown'],
    [
      '../notes%20with%20spaces/linked%20note.md',
      'workspace:notes with spaces/linked note.md',
    ],
    ['../root.md', 'workspace:root.md'],
    ['/docs/readme.md', 'workspace:docs/readme.md'],
  ])('resolves %s inside the current workspace', (href, expected) => {
    expect(resolveInternalLink(current, href)).toBe(expected);
  });

  it('resolves a parent link from a path containing spaces', () => {
    const linkedNote = 'markdown-edge-cases:notes with spaces/linked note.md';

    expect(resolveInternalLink(linkedNote, '../00-overview.md')).toBe(
      'markdown-edge-cases:00-overview.md',
    );
    expect(
      resolveInternalLink(linkedNote, '../../00-overview.md'),
    ).toBeUndefined();
  });

  it.each([
    ['./same-level.md', 'workspace:notes/same-level.md'],
    ['.%2Fsame-level.md', undefined],
    ['%2E/same-level.md', 'workspace:notes/same-level.md'],
    ['%2e%2e/root.md', 'workspace:root.md'],
    ['encoded%20space.md', 'workspace:notes/encoded space.md'],
    ['unicode-%F0%9F%98%80.md', 'workspace:notes/unicode-😀.md'],
    ['hash%23name.md', 'workspace:notes/hash#name.md'],
    ['percent%25name.md', 'workspace:notes/percent%name.md'],
    ['plus+name.md', 'workspace:notes/plus+name.md'],
    ['upper.MD', 'workspace:notes/upper.MD'],
    ['upper.MARKDOWN', 'workspace:notes/upper.MARKDOWN'],
    ['.hidden/note.md', 'workspace:notes/.hidden/note.md'],
    ['three...dots/note.md', 'workspace:notes/three...dots/note.md'],
    [' spaced.md ', 'workspace:notes/spaced.md'],
    ['/root.markdown', 'workspace:root.markdown'],
  ])('handles encoded target %j', (href, expected) => {
    expect(resolveInternalLink(current, href)).toBe(expected);
  });

  it.each([
    [
      'workspace:nested/deep/source.md',
      '../../00-overview.md',
      'workspace:00-overview.md',
    ],
    [
      'workspace:nested/deep/source.md',
      './sibling-note.md',
      'workspace:nested/deep/sibling-note.md',
    ],
    [
      'workspace:source.md',
      'folder.bundle/dotted-note.md',
      'workspace:folder.bundle/dotted-note.md',
    ],
    ['workspace:nested/source.md', '/root-note.md', 'workspace:root-note.md'],
    [
      'workspace:nested/source.md',
      '../notes with spaces/linked note.md',
      'workspace:notes with spaces/linked note.md',
    ],
  ])('resolves interoperable Markdown path %j from %j', (currentWsPath, href, expected) => {
    expect(resolveInternalLink(currentWsPath, href)).toBe(expected);
  });

  it.each([
    '../../outside.md',
    '/%2e%2e/outside.md',
    '%2e%2e/%2e%2e/outside.md',
    '%2E%2E/%2E%2E/outside.md',
    '%2e./%2e./outside.md',
    '.%2e/.%2e/outside.md',
    '..%2f..%2foutside.md',
    '..%2Foutside.md',
    '..%5Coutside.md',
    '%2e%2e%5coutside.md',
    '\\..\\outside.md',
    '..\\outside.md',
    'subdir%2Foutside.md',
    'subdir%5Coutside.md',
  ])('rejects traversal or encoded separator attack %j', (href) => {
    expect(resolveInternalLink(current, href)).toBeUndefined();
  });

  it.each([
    '//outside.md',
    '///outside.md',
    'subdir//outside.md',
    'subdir///outside.md',
    'bad%encoding.md',
    'bad%.md',
    'bad%2.md',
    'bad%GG.md',
    'overlong%C0%AFpath.md',
    'overlong%E0%80%AFpath.md',
    'surrogate%ED%A0%80.md',
    'out-of-range%F4%90%80%80.md',
    'nul%00byte.md',
    'tab%09name.md',
    'line%0Abreak.md',
    'carriage%0Dreturn.md',
    'colon%3Ainject.md',
    'drive-C%3Aoutside.md',
    'question%3Fmark.md',
    'star%2Aname.md',
  ])('rejects malformed or invalid workspace path %j', (href) => {
    expect(resolveInternalLink(current, href)).toBeUndefined();
  });

  it.each([
    'file.txt',
    'file.md.txt',
    'file.md?query',
    'file.md#fragment',
    '//example.com/file.md',
    'https://example.com/file.md',
    'HTTPS://example.com/file.md',
    'http://127.0.0.1/file.md',
    'javascript:payload.md',
    'JaVaScRiPt:payload.md',
    'https:%2F%2Fevil.example/file.md',
    'data:text/plain,file.md',
    'other-workspace:file.md',
  ])('rejects non-internal target %j', (href) => {
    expect(resolveInternalLink(current, href)).toBeUndefined();
  });

  it.each([
    '',
    'missing-separator.md',
    ':notes/current.md',
    'workspace:',
    'workspace:notes/',
  ])('rejects invalid current note path %j', (currentWsPath) => {
    expect(resolveInternalLink(currentWsPath, 'target.md')).toBeUndefined();
  });

  it('rejects traversal outside the workspace and non-internal targets', () => {
    expect(resolveInternalLink(current, '../../outside.md')).toBeUndefined();
    expect(
      resolveInternalLink(current, '%2e%2e/%2e%2e/outside.md'),
    ).toBeUndefined();
    expect(resolveInternalLink(current, 'bad%2Fpath.md')).toBeUndefined();
    expect(resolveInternalLink(current, 'bad%encoding.md')).toBeUndefined();
    expect(resolveInternalLink(current, 'file.txt')).toBeUndefined();
    expect(
      resolveInternalLink(current, 'https://example.com/file.md'),
    ).toBeUndefined();
  });
});
