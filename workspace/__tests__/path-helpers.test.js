import { parseLocalFilePath } from '../path-helpers';

describe('parseLocalFilePath', () => {
  test('simple filename', () => {
    expect(
      parseLocalFilePath('my-img.png', 'wallah:my-baby'),
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
