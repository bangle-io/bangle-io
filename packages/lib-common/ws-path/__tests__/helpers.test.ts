import {
  getExtension,
  hasValidNoteExtension,
  parseLocalFilePath,
  removeExtension,
} from '../helpers';

describe('hasValidNoteExtension', () => {
  test('works', () => {
    expect(hasValidNoteExtension('/a/b/c.md')).toBe(true);
    expect(hasValidNoteExtension('/a/b/c.xyz.md')).toBe(true);
    expect(hasValidNoteExtension('/a/b/c.xyz')).toBe(false);
  });
});

describe('getExtension', () => {
  test('works', () => {
    expect(getExtension('/a/b/c.md')).toBe('.md');
    expect(getExtension('/a/b/c.xyz.md')).toBe('.md');
    expect(getExtension('/a/b/c.xyz')).toBe('.xyz');
    expect(getExtension('/a/b/cxyz')).toBe(undefined);
  });
});

describe('removeExtension', () => {
  test('works', () => {
    expect(removeExtension('/a/b/c.md')).toBe('/a/b/c');
    expect(removeExtension('/a/b/c.xyz.md')).toBe('/a/b/c.xyz');
    expect(removeExtension('/a/b/c.xyz')).toBe('/a/b/c');
    expect(removeExtension('/a/b/cxyz')).toBe('/a/b/cxyz');
  });
});

describe('parseLocalFilePath', () => {
  test('simple filename', () => {
    expect(
      parseLocalFilePath('my-img.png', 'wallah:my-baby.png'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);
  });

  test('It handles ./ url', () => {
    expect(
      parseLocalFilePath('./my-img.png', 'wallah:my-baby.md'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);
  });

  test('handles encoded spaces in url', () => {
    expect(
      parseLocalFilePath('./my%20img.png', 'wallah:my-baby.md'),
    ).toMatchInlineSnapshot(`"wallah:my img.png"`);
  });

  test('handles spaces in url', () => {
    expect(
      parseLocalFilePath('./my img.png', 'wallah:my-baby.md'),
    ).toMatchInlineSnapshot(`"wallah:my img.png"`);
  });

  test('It handles ./ url when in inside a folder', () => {
    expect(
      parseLocalFilePath('./my-img.png', 'wallah:parent-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
    expect(
      parseLocalFilePath('./my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:parent-dir/sub-dir/my-img.png"`);
  });

  test('It handles ../ url when in inside a folder', () => {
    expect(
      parseLocalFilePath('../my-img.png', 'wallah:parent-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

    expect(
      parseLocalFilePath('../my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
  });

  test('It handles ../../ url when in inside a folder', () => {
    expect(
      parseLocalFilePath('../../my-img.png', 'wallah:parent-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

    expect(
      parseLocalFilePath(
        '../../my-img.png',
        'wallah:parent-dir/sub-dir/sub-sub-dir/note.md',
      ),
    ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
  });

  test('It handles / url', () => {
    expect(
      parseLocalFilePath('/my-img.png', 'wallah:parent-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

    expect(
      parseLocalFilePath('/my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
    ).toMatchInlineSnapshot(`"wallah:my-img.png"`);
  });
});
