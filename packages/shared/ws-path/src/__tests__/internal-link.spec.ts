import { describe, expect, it } from 'vitest';
import {
  createWikiLinkIndex,
  createWikiLinkTarget,
  resolveInternalWsPath,
  resolveWikiLinkTarget,
} from '../internal-link';
import { WsFilePath } from '../ws-path';

const home = WsFilePath.fromString('notes:home.md');
const folderName = WsFilePath.fromString('notes:folder/name.md');
const paths = [
  home,
  folderName,
  WsFilePath.fromString('notes:other/name.markdown'),
  WsFilePath.fromString('notes:folder/bangle.io.md'),
  WsFilePath.fromString('notes:folder/bugs in bangle.io.md'),
  WsFilePath.fromString('notes:folder/Mixed.md'),
  WsFilePath.fromString('notes:folder/plain.txt'),
  WsFilePath.fromString('elsewhere:name.md'),
];

describe('resolveInternalWsPath', () => {
  it('resolves safe relative and root paths', () => {
    expect(resolveInternalWsPath(folderName, '../home.md')?.wsPath).toBe(
      'notes:home.md',
    );
    expect(
      resolveInternalWsPath(folderName, '/other/name.markdown')?.wsPath,
    ).toBe('notes:other/name.markdown');
  });

  it.each([
    '../../escape.md',
    '%2Fetc.md',
    'bad%ZZ.md',
    'other:name.md',
  ])('rejects unsafe path %s', (target) =>
    expect(resolveInternalWsPath(folderName, target)).toBeUndefined());
});

describe('resolveWikiLinkTarget', () => {
  it('resolves unique stems, exact case, extensions, and dotted stems', () => {
    expect(resolveWikiLinkTarget(home, 'home', paths)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, 'mixed', paths)?.wsPath).toBe(
      'notes:folder/Mixed.md',
    );
    expect(resolveWikiLinkTarget(home, 'bangle.io', paths)?.wsPath).toBe(
      'notes:folder/bangle.io.md',
    );
    expect(
      resolveWikiLinkTarget(home, 'bugs in bangle.io', paths)?.wsPath,
    ).toBe('notes:folder/bugs in bangle.io.md');
    expect(resolveWikiLinkTarget(home, 'Mixed.md', paths)?.wsPath).toBe(
      'notes:folder/Mixed.md',
    );
  });

  it('prefers exact-case stems over case-insensitive matches', () => {
    const casePaths = [
      WsFilePath.fromString('notes:Hello.md'),
      WsFilePath.fromString('notes:hello.md'),
    ];
    expect(resolveWikiLinkTarget(home, 'Hello', casePaths)?.wsPath).toBe(
      'notes:Hello.md',
    );
    expect(resolveWikiLinkTarget(home, 'hello', casePaths)?.wsPath).toBe(
      'notes:hello.md',
    );
    expect(resolveWikiLinkTarget(home, 'HELLO', casePaths)).toBeUndefined();
  });

  it('keeps duplicate basenames unresolved unless a path disambiguates them', () => {
    expect(resolveWikiLinkTarget(home, 'name', paths)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder/name', paths)?.wsPath).toBe(
      'notes:folder/name.md',
    );
    expect(resolveWikiLinkTarget(home, '/other/name', paths)?.wsPath).toBe(
      'notes:other/name.markdown',
    );
  });

  it('supports current-note-relative targets and rejects unsafe targets', () => {
    expect(resolveWikiLinkTarget(folderName, '../home', paths)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, './folder/name', paths)?.wsPath).toBe(
      'notes:folder/name.md',
    );
    expect(resolveWikiLinkTarget(home, '../home', paths)).toBeUndefined();
    expect(
      resolveWikiLinkTarget(home, 'elsewhere:name', paths),
    ).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder/plain', paths)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder%2Fname', paths)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'bad%ZZ', paths)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, '/missing/name', paths)).toBeUndefined();
  });

  it('rejects unsafe bare encoded targets before stem matching', () => {
    const unsafePaths = [
      WsFilePath.fromString('notes:folder%2Fname.md'),
      WsFilePath.fromString('notes:bad%ZZ.md'),
    ];
    expect(
      resolveWikiLinkTarget(home, 'folder%2Fname', unsafePaths),
    ).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'bad%ZZ', unsafePaths)).toBeUndefined();
  });

  it('generates bare unique targets and rooted duplicate targets', () => {
    expect(createWikiLinkTarget(home, paths)).toBe('home');
    expect(createWikiLinkTarget(folderName, paths)).toBe('/folder/name');
  });

  it('resolves and generates targets from a reusable index', () => {
    const index = createWikiLinkIndex(paths, 'notes');
    expect(resolveWikiLinkTarget(home, 'home', index)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, 'name', index)).toBeUndefined();
    expect(createWikiLinkTarget(folderName, index)).toBe('/folder/name');
    expect(index.notes.map((path) => path.wsPath)).not.toContain(
      'elsewhere:name.md',
    );
  });
});
