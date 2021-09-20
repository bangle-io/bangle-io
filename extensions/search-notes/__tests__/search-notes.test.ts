import { createPMNode } from 'test-utils/create-pm-node';
import { sleep } from 'utils';
import { resolvePath } from 'ws-path';
import {
  endStringWithWord,
  getMatchFragment,
  matchText,
  searchNotes,
  startStringWithWord,
} from '../search-notes';
import noteTags from 'note-tags';
import { CONCURRENCY } from '../constants';

describe('Plain text search', () => {
  const createEditor = (md) => {
    return createPMNode()(md);
  };

  test('works with empty data', async () => {
    const result = await searchNotes(
      '',
      [],
      () => {
        return undefined as any;
      },
      new AbortController().signal,
    );

    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('Maps large data', async () => {
    const query = 'test';
    const controller = new AbortController();
    const fileData = Array.from({ length: 1000 }, () => ({
      name: '1.md',
      text: `- I am a list`,
    }));

    const mapper = jest.fn(async (wsPath) => {
      return createEditor(
        fileData.find((r) => r.name === resolvePath(wsPath).fileName)?.text,
      );
    });
    const res = searchNotes(
      query,
      fileData.map((f) => `test-ws:${f.name}`),
      mapper,
      controller.signal,
    );

    await res;

    expect(mapper).toBeCalledTimes(1000);
  });

  test('Aborting stops the search', async () => {
    const query = 'test';
    const controller = new AbortController();
    const fileData = Array.from({ length: 1000 }, () => ({
      name: '1.md',
      text: `- I am a list`,
    }));

    const mapper = jest.fn(async (wsPath) => {
      await sleep(10);
      return createEditor(
        fileData.find((r) => r.name === resolvePath(wsPath).fileName)?.text,
      );
    });
    const res = searchNotes(
      query,
      fileData.map((f) => `test-ws:${f.name}`),
      mapper,
      controller.signal,
    );

    controller.abort();

    await expect(res).rejects.toThrowError(`Aborted`);
    // only the ones in flight would be called
    expect(mapper).toBeCalledTimes(CONCURRENCY);
  });

  describe('Works with simple data', () => {
    const getResult = async (query, fileData) =>
      searchNotes(
        query,
        fileData.map((f) => `test-ws:${f.name}`),
        async (wsPath) => {
          return createEditor(
            fileData.find((r) => r.name === resolvePath(wsPath).fileName).text,
          );
        },
        new AbortController().signal,
      );

    test('empty query should return no data', async () => {
      expect(
        await getResult('', [{ name: '1.md', text: `- I am a list` }]),
      ).toEqual([]);
    });

    test('if match is the first thing in the node match starts with empty string', async () => {
      expect(
        (
          await getResult('Beauty', [
            {
              name: '1.md',
              text: `- Beauty is a subjective matter\n - ugliness and beauty go hand in hand`,
            },
          ])
        )?.[0]?.matches,
      ).toEqual([
        {
          parent: 'listItem',
          parentPos: 2,
          match: ['', 'beauty', ' is a subjective matter'],
        },
        {
          parent: 'listItem',
          parentPos: 35,
          match: ['ugliness and ', 'beauty', ' go hand in hand'],
        },
      ]);
    });

    test('simple query', async () => {
      expect(
        await getResult('para', [{ name: '1.md', text: `I am a paragraph` }]),
      ).toMatchInlineSnapshot(`
      Array [
        Object {
          "matches": Array [
            Object {
              "match": Array [
                "i am a ",
                "para",
                "graph",
              ],
              "parent": "paragraph",
              "parentPos": 0,
            },
          ],
          "wsPath": "test-ws:1.md",
        },
      ]
    `);
    });

    test('no match', async () => {
      expect(
        await getResult('what', [{ name: '1.md', text: `I am a paragraph` }]),
      ).toMatchInlineSnapshot(`Array []`);
    });

    test('works if no files', async () => {
      expect(await getResult('what', [])).toMatchInlineSnapshot(`Array []`);
    });

    test('works if file has no data', async () => {
      expect(
        await getResult('what', [{ name: '1.md', text: `` }]),
      ).toMatchInlineSnapshot(`Array []`);
    });

    test('multiple matches in a single file', async () => {
      expect(
        await getResult('what', [
          {
            name: '1.md',
            text: `- what is what in real life?\n > what do you think about that question`,
          },
        ]),
      ).toMatchInlineSnapshot(`
      Array [
        Object {
          "matches": Array [
            Object {
              "match": Array [
                "",
                "what",
                " is what in real life?",
              ],
              "parent": "listItem",
              "parentPos": 2,
            },
            Object {
              "match": Array [
                "what is ",
                "what",
                " in real life?",
              ],
              "parent": "listItem",
              "parentPos": 2,
            },
            Object {
              "match": Array [
                "",
                "what",
                " do you think about that question",
              ],
              "parent": "blockquote",
              "parentPos": 33,
            },
          ],
          "wsPath": "test-ws:1.md",
        },
      ]
    `);
    });

    test('multiple files where some files have no match', async () => {
      expect(
        await getResult('hunter', [
          { name: '1.md', text: `bounty hunter` },
          { name: '2.md', text: 'madness' },
          { name: '3.md', text: 'booty hunter' },
        ]),
      ).toMatchInlineSnapshot(`
      Array [
        Object {
          "matches": Array [
            Object {
              "match": Array [
                "bounty ",
                "hunter",
                "",
              ],
              "parent": "paragraph",
              "parentPos": 0,
            },
          ],
          "wsPath": "test-ws:1.md",
        },
        Object {
          "matches": Array [
            Object {
              "match": Array [
                "booty ",
                "hunter",
                "",
              ],
              "parent": "paragraph",
              "parentPos": 0,
            },
          ],
          "wsPath": "test-ws:3.md",
        },
      ]
    `);
    });
  });
});

describe('matchText', () => {
  test('1 works', () => {
    expect(matchText('test', 'hello test world test match', 20))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "hello ",
          "test",
          " world test match",
        ],
        Array [
          "hello test world ",
          "test",
          " match",
        ],
      ]
    `);
  });

  test('2 works', () => {
    expect(matchText('test', 'hello test world test match', 8))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "hello ",
          "test",
          " world…",
        ],
        Array [
          "…world ",
          "test",
          " match",
        ],
      ]
    `);
  });

  test('3 works', () => {
    expect(matchText('test', 'test', 8)).toMatchInlineSnapshot(`
      Array [
        Array [
          "",
          "test",
          "",
        ],
      ]
    `);
  });

  test('4 works', () => {
    expect(
      matchText('te/st', 'what is test but tes/st and te/st in this life', 8),
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "…and ",
          "te/st",
          " in…",
        ],
      ]
    `);
  });

  test('5 works', () => {
    expect(
      matchText(
        'long',
        'magic areallylongwordbefore long ishereandwhatto do',
        8,
      ),
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          "…areally",
          "long",
          "wordbefo…",
        ],
        Array [
          "…",
          "long",
          "…",
        ],
      ]
    `);
  });

  test('respects limits', () => {
    const res = matchText(
      'bro',
      'bro bro bro bro bro hey bro bro bro bro bro bro bro hey bro bro you listening bro !',
      8,
      5,
    );
    expect(res.length).toBe(5);
  });
});

describe('startStringWithWord & endStringWithWord', () => {
  test('1 case', () => {
    const str = 'abc wow';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"wow"`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`"abc"`);
  });
  test('2 case', () => {
    const str = ' abc wow';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"abc wow"`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`" abc"`);
  });
  test('3 case', () => {
    const str = 'abc wow ';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"wow "`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`"abc wow"`);
  });

  test('4 case', () => {
    const str = ' abc wow ';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"abc wow "`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`" abc wow"`);
  });

  test('5 case', () => {
    const str = '  abc wow';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"abc wow"`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`"  abc"`);
  });

  test('6 case', () => {
    const str = 'abc wow  ';
    expect(startStringWithWord(str)).toMatchInlineSnapshot(`"wow  "`);
    expect(endStringWithWord(str)).toMatchInlineSnapshot(`"abc wow"`);
  });
});

describe('getMatchFragment', () => {
  test('1: end ellipsis', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 3, 6, 9)).toMatchInlineSnapshot(`
      Array [
        "my ",
        "big",
        " banana…",
      ]
    `);
  });

  test('2: end ellipsis', () => {
    const str = 'something holy what nonsense will this succeed?';
    expect(getMatchFragment(str, 9, 14, 9)).toMatchInlineSnapshot(`
      Array [
        "something",
        " holy",
        " what…",
      ]
    `);
  });

  test('no end ellipsis if maxChars is bigger than text', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 3, 6, 40)).toMatchInlineSnapshot(`
      Array [
        "my ",
        "big",
        " banana is good",
      ]
    `);
  });

  test('1: start ellipsis', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 14, 17, 9)).toMatchInlineSnapshot(`
      Array [
        "…banana ",
        "is ",
        "good",
      ]
    `);
  });

  test('1: no start ellipsis if big', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 14, 17, 39)).toMatchInlineSnapshot(`
      Array [
        "my big banana ",
        "is ",
        "good",
      ]
    `);
  });

  test('works if match is at start', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 0, 2, 39)).toMatchInlineSnapshot(`
      Array [
        "",
        "my",
        " big banana is good",
      ]
    `);
  });

  test('2: works if match is at start', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 0, 2, 8)).toMatchInlineSnapshot(`
      Array [
        "",
        "my",
        " big…",
      ]
    `);
  });
});

describe('understands tag searching', () => {
  const createEditor = (md) => {
    return createPMNode([noteTags])(md);
  };

  const getResult = async (query, fileData) =>
    searchNotes(
      query,
      fileData.map((f) => `test-ws:${f.name}`),
      async (wsPath) => {
        return createEditor(
          fileData.find((r) => r.name === resolvePath(wsPath).fileName).text,
        );
      },
      new AbortController().signal,
    );

  test('list before tag does not show up', async () => {
    const results = await getResult('tag:awesome-tag', [
      {
        name: '1.md',
        text: `#sad

- I am a list

hello I am an #awesome-tag`,
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results?.[0]?.matches).toEqual([
      {
        match: ['hello I am an ', '#awesome-tag', ''],
        parent: 'paragraph',
        parentPos: 35,
      },
    ]);
  });

  test('soft break in list shows up as a white space', async () => {
    const results = await getResult('tag:awesome-tag', [
      {
        name: '1.md',
        text: `#sad
- I am a list\nhello I am an #awesome-tag`,
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results?.[0]?.matches).toEqual([
      {
        match: ['I am a list\nhello I am an ', '#awesome-tag', ''],
        parent: 'paragraph',
        parentPos: 32,
      },
    ]);
  });

  test('text after shows up', async () => {
    const results = await getResult('tag:awesome-tag', [
      {
        name: '1.md',
        text: `I am an #awesome-tag in this small world`,
      },
    ]);
    expect(results).toHaveLength(1);
    expect(results?.[0]?.matches).toEqual([
      {
        match: ['I am an ', '#awesome-tag', ' in this small world'],
        parent: 'paragraph',
        parentPos: 9,
      },
    ]);
  });
});
