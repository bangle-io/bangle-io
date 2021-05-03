import { parseLocalPath } from '../parse-local-path';

test('simple filename', () => {
  expect(parseLocalPath('my-img.png', 'wallah:my-baby')).toMatchInlineSnapshot(
    `"wallah:my-img.png"`,
  );
});

test('It handles ./ url', () => {
  expect(
    parseLocalPath('./my-img.png', 'wallah:my-baby.md'),
  ).toMatchInlineSnapshot(`"wallah:my-img.png"`);
});

test('It handles ./ url when in inside a folder', () => {
  expect(
    parseLocalPath('./my-img.png', 'wallah:parent-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
  expect(
    parseLocalPath('./my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:parent-dir/sub-dir/my-img.png"`);
});

test('It handles ../ url when in inside a folder', () => {
  expect(
    parseLocalPath('../my-img.png', 'wallah:parent-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

  expect(
    parseLocalPath('../my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
});

test('It handles ../../ url when in inside a folder', () => {
  expect(
    parseLocalPath('../../my-img.png', 'wallah:parent-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

  expect(
    parseLocalPath(
      '../../my-img.png',
      'wallah:parent-dir/sub-dir/sub-sub-dir/note.md',
    ),
  ).toMatchInlineSnapshot(`"wallah:parent-dir/my-img.png"`);
});

test('It handles / url', () => {
  expect(
    parseLocalPath('/my-img.png', 'wallah:parent-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:my-img.png"`);

  expect(
    parseLocalPath('/my-img.png', 'wallah:parent-dir/sub-dir/note.md'),
  ).toMatchInlineSnapshot(`"wallah:my-img.png"`);
});
