import { listAllNotes } from '../file-ops';
import { fzfSearchNoteWsPaths } from '../fzf-search-notes-ws-path';

jest.mock('../file-ops', () => {
  return {
    listAllNotes: jest.fn(async () => []),
  };
});

let listAllNotesMock = listAllNotes as jest.MockedFunction<typeof listAllNotes>;

test('works', async () => {
  listAllNotesMock.mockResolvedValue([
    'test-ws:my-file.md',
    'test-ws:rando.md',
  ]);

  const controller = new AbortController();
  const result = await fzfSearchNoteWsPaths(
    controller.signal,
    'test-ws',
    'my-file',
  );
  expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "end": 7,
            "item": "test-ws:my-file.md",
            "positions": Set {
              6,
              5,
              4,
              3,
              2,
              1,
              0,
            },
            "score": 176,
            "start": 0,
          },
        ]
      `);
});
