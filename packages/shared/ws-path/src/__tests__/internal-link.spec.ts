import { describe, expect, it } from 'vitest';
import {
  createMissingWikiLinkTarget,
  createWikiLinkIndex,
  resolveInternalWsPath,
  resolveWikiLinkTarget,
  type WikiLinkIndex,
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
const index = createWikiLinkIndex(paths, 'notes');

function searchTargetFor(
  wikiLinkIndex: WikiLinkIndex,
  path: WsFilePath,
): string | undefined {
  return wikiLinkIndex.searchRecords.find(
    (record) => record.wsPath.wsPath === path.wsPath,
  )?.target;
}

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
    expect(resolveWikiLinkTarget(home, 'home', index)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, 'mixed', index)?.wsPath).toBe(
      'notes:folder/Mixed.md',
    );
    expect(resolveWikiLinkTarget(home, 'bangle.io', index)?.wsPath).toBe(
      'notes:folder/bangle.io.md',
    );
    expect(
      resolveWikiLinkTarget(home, 'bugs in bangle.io', index)?.wsPath,
    ).toBe('notes:folder/bugs in bangle.io.md');
    expect(resolveWikiLinkTarget(home, 'Mixed.md', index)?.wsPath).toBe(
      'notes:folder/Mixed.md',
    );
  });

  it('prefers exact-case stems over case-insensitive matches', () => {
    const casePaths = [
      WsFilePath.fromString('notes:Hello.md'),
      WsFilePath.fromString('notes:hello.md'),
    ];
    const caseIndex = createWikiLinkIndex(casePaths, 'notes');
    expect(resolveWikiLinkTarget(home, 'Hello', caseIndex)?.wsPath).toBe(
      'notes:Hello.md',
    );
    expect(resolveWikiLinkTarget(home, 'hello', caseIndex)?.wsPath).toBe(
      'notes:hello.md',
    );
    expect(resolveWikiLinkTarget(home, 'HELLO', caseIndex)).toBeUndefined();
  });

  it('keeps duplicate basenames unresolved unless a path disambiguates them', () => {
    expect(resolveWikiLinkTarget(home, 'name', index)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder/name', index)?.wsPath).toBe(
      'notes:folder/name.md',
    );
    expect(resolveWikiLinkTarget(home, '/other/name', index)?.wsPath).toBe(
      'notes:other/name.markdown',
    );
  });

  it('supports current-note-relative targets and rejects unsafe targets', () => {
    expect(resolveWikiLinkTarget(folderName, '../home', index)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, './folder/name', index)?.wsPath).toBe(
      'notes:folder/name.md',
    );
    expect(resolveWikiLinkTarget(home, '../home', index)).toBeUndefined();
    expect(
      resolveWikiLinkTarget(home, 'elsewhere:name', index),
    ).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder/plain', index)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'folder%2Fname', index)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'bad%ZZ', index)).toBeUndefined();
    expect(resolveWikiLinkTarget(home, '/missing/name', index)).toBeUndefined();
  });

  it('rejects unsafe bare encoded targets before stem matching', () => {
    const unsafePaths = [
      WsFilePath.fromString('notes:folder%2Fname.md'),
      WsFilePath.fromString('notes:bad%ZZ.md'),
    ];
    const unsafeIndex = createWikiLinkIndex(unsafePaths, 'notes');
    expect(
      resolveWikiLinkTarget(home, 'folder%2Fname', unsafeIndex),
    ).toBeUndefined();
    expect(resolveWikiLinkTarget(home, 'bad%ZZ', unsafeIndex)).toBeUndefined();
  });

  it('indexes bare unique targets and rooted duplicate targets for search', () => {
    expect(searchTargetFor(index, home)).toBe('home');
    expect(searchTargetFor(index, folderName)).toBe('/folder/name');
  });

  it('resolves and generates targets from a reusable index', () => {
    expect(resolveWikiLinkTarget(home, 'home', index)?.wsPath).toBe(
      'notes:home.md',
    );
    expect(resolveWikiLinkTarget(home, 'name', index)).toBeUndefined();
    expect(searchTargetFor(index, folderName)).toBe('/folder/name');
    expect(index.notes.map((path) => path.wsPath)).not.toContain(
      'elsewhere:name.md',
    );
  });
});

describe('createMissingWikiLinkTarget', () => {
  it('creates bare targets at the workspace root', () => {
    expect(createMissingWikiLinkTarget(folderName, 'new note')?.wsPath).toBe(
      'notes:new note.md',
    );
    expect(createMissingWikiLinkTarget(folderName, 'new note.md')?.wsPath).toBe(
      'notes:new note.md',
    );
    expect(
      createMissingWikiLinkTarget(folderName, 'new note.markdown')?.wsPath,
    ).toBe('notes:new note.markdown');
  });

  it('creates explicit targets at root-relative or current-relative paths', () => {
    expect(createMissingWikiLinkTarget(home, 'folder/new')?.wsPath).toBe(
      'notes:folder/new.md',
    );
    expect(createMissingWikiLinkTarget(home, '/folder/new')?.wsPath).toBe(
      'notes:folder/new.md',
    );
    expect(createMissingWikiLinkTarget(folderName, './child')?.wsPath).toBe(
      'notes:folder/child.md',
    );
    expect(createMissingWikiLinkTarget(folderName, '../sibling')?.wsPath).toBe(
      'notes:sibling.md',
    );
  });

  it.each([
    '../escape',
    '../../escape',
    'bad%ZZ',
    'folder%2Fname',
    'other:name',
    'heading#target',
    '#current-heading',
    'query?target',
  ])('rejects unsafe or unsupported missing target %s', (target) => {
    expect(createMissingWikiLinkTarget(home, target)).toBeUndefined();
  });
});
