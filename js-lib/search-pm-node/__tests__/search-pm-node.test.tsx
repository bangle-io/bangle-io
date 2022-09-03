/**
 * @jest-environment @bangle.io/jsdom-env
 */

/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import { psx, renderTestEditor } from '@bangle.dev/test-helpers';
import { wikiLink } from '@bangle.dev/wiki-link';

import { DEFAULT_CONCURRENCY } from '../config';
import {
  endStringWithWord,
  getMatchFragment,
  matchText,
  searchPmNode,
  startStringWithWord,
} from '../search-pm-node';

test.todo('Can search by *');

describe('Plain text search', () => {
  const specRegistry = new SpecRegistry([...defaultSpecs()]);
  const plugins = [...defaultPlugins()];

  const testEditor = renderTestEditor({
    specRegistry,
    plugins,
  });

  const makeDoc = (doc: any) => {
    return testEditor(doc).view.state.doc;
  };

  test('works with undefined data', async () => {
    const result = await searchPmNode(
      new AbortController().signal,
      '',
      [],
      () => {
        return undefined as any;
      },
    );

    expect(result).toMatchInlineSnapshot(`[]`);
  });
  test('works with empty data', async () => {
    const doc = makeDoc(
      <doc>
        <para></para>
      </doc>,
    );

    const cb = jest.fn(async () => {
      return doc;
    });

    const result = await searchPmNode(
      new AbortController().signal,
      's',
      ['uid-1'],
      cb,
    );

    expect(result).toMatchInlineSnapshot(`[]`);
    expect(cb).toBeCalledTimes(1);
  });

  test('Maps large data', async () => {
    const query = 'test';
    const controller = new AbortController();
    const fileData = Array.from({ length: 1000 }, () => ({
      name: '1.md',
      node: makeDoc(
        <doc>
          <ul>
            <li>
              <para>I am a list</para>
            </li>
          </ul>
        </doc>,
      ),
    }));

    const mapper = jest.fn(async (uid) => {
      return fileData.find((r) => r.name === uid)?.node!;
    });

    const res = searchPmNode(
      controller.signal,
      query,
      fileData.map((f) => f.name),
      mapper,
    );

    await res;

    expect(mapper).toBeCalledTimes(1000);
  });

  test('Aborting stops the search', async () => {
    const query = 'test';
    const controller = new AbortController();
    const fileData = Array.from({ length: 1000 }, () => ({
      name: '1.md',
      node: makeDoc(
        <doc>
          <ul>
            <li>
              <para>I am a list</para>
            </li>
          </ul>
        </doc>,
      ),
    }));

    const mapper = jest.fn(async (uid) => {
      return fileData.find((r) => r.name === uid)?.node!;
    });

    const res = searchPmNode(
      controller.signal,
      query,
      fileData.map((f) => f.name),
      mapper,
    );

    controller.abort();

    await expect(res).rejects.toThrowError(`Aborted`);
    // only the ones in flight would be called
    expect(mapper).toBeCalledTimes(DEFAULT_CONCURRENCY);
  });

  describe('Works with simple data', () => {
    const getResult = async (
      query: string,
      fileData: Array<{ name: string; node: any }>,
    ) => {
      return searchPmNode(
        new AbortController().signal,
        query,
        fileData.map((f) => f.name),
        async (uid) => {
          return fileData.find((r) => r.name === uid)?.node!;
        },
      );
    };
    test('empty query should return no data', async () => {
      expect(
        await getResult('', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <ul>
                  <li>
                    <para>I am a list</para>
                  </li>
                </ul>
              </doc>,
            ),
          },
        ]),
      ).toEqual([]);
    });

    test('if match is the first thing in the node match starts with empty string', async () => {
      expect(
        (
          await getResult('Beauty', [
            {
              name: '1.md',
              node: makeDoc(
                <doc>
                  <ul>
                    <li>
                      <para>Beauty is a subjective matter</para>
                    </li>
                    <li>
                      <para>ugliness and beauty go hand in hand</para>
                    </li>
                  </ul>
                </doc>,
              ),
            },
          ])
        )[0]?.matches,
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
        await getResult('para', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <para>I am a paragraph</para>
              </doc>,
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`
        [
          {
            "matches": [
              {
                "match": [
                  "i am a ",
                  "para",
                  "graph",
                ],
                "parent": "paragraph",
                "parentPos": 0,
              },
            ],
            "uid": "1.md",
          },
        ]
      `);
    });

    test('no match', async () => {
      expect(
        await getResult('what', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <para>I am a paragraph</para>
              </doc>,
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`[]`);
    });

    test('works if no files', async () => {
      expect(await getResult('what', [])).toMatchInlineSnapshot(`[]`);
    });

    test('works if file has no data', async () => {
      expect(
        await getResult('what', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <para></para>
              </doc>,
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`[]`);
    });

    test('multiple matches in a single file', async () => {
      expect(
        await getResult('what', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <ul>
                  <li>
                    <para>what is what in real life?</para>
                  </li>
                </ul>
                <blockquote>
                  <para>what do you think about that question</para>
                </blockquote>
              </doc>,
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`
        [
          {
            "matches": [
              {
                "match": [
                  "",
                  "what",
                  " is what in real life?",
                ],
                "parent": "listItem",
                "parentPos": 2,
              },
              {
                "match": [
                  "what is ",
                  "what",
                  " in real life?",
                ],
                "parent": "listItem",
                "parentPos": 2,
              },
              {
                "match": [
                  "",
                  "what",
                  " do you think about that question",
                ],
                "parent": "blockquote",
                "parentPos": 33,
              },
            ],
            "uid": "1.md",
          },
        ]
      `);
    });

    test('multiple files where some files have no match', async () => {
      expect(
        await getResult('hunter', [
          {
            name: '1.md',
            node: makeDoc(
              <doc>
                <para>bounty hunter</para>
              </doc>,
            ),
          },

          {
            name: '2.md',
            node: makeDoc(
              <doc>
                <para>madness</para>
              </doc>,
            ),
          },

          {
            name: '3.md',
            node: makeDoc(
              <doc>
                <para>booty hunter</para>
              </doc>,
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`
        [
          {
            "matches": [
              {
                "match": [
                  "bounty ",
                  "hunter",
                  "",
                ],
                "parent": "paragraph",
                "parentPos": 0,
              },
            ],
            "uid": "1.md",
          },
          {
            "matches": [
              {
                "match": [
                  "booty ",
                  "hunter",
                  "",
                ],
                "parent": "paragraph",
                "parentPos": 0,
              },
            ],
            "uid": "3.md",
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
      [
        [
          "hello ",
          "test",
          " world test match",
        ],
        [
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
      [
        [
          "hello ",
          "test",
          " world…",
        ],
        [
          "…world ",
          "test",
          " match",
        ],
      ]
    `);
  });

  test('3 works', () => {
    expect(matchText('test', 'test', 8)).toMatchInlineSnapshot(`
      [
        [
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
      [
        [
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
      [
        [
          "…areally",
          "long",
          "wordbefo…",
        ],
        [
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
      [
        "my ",
        "big",
        " banana…",
      ]
    `);
  });

  test('2: end ellipsis', () => {
    const str = 'something holy what nonsense will this succeed?';
    expect(getMatchFragment(str, 9, 14, 9)).toMatchInlineSnapshot(`
      [
        "something",
        " holy",
        " what…",
      ]
    `);
  });

  test('no end ellipsis if maxChars is bigger than text', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 3, 6, 40)).toMatchInlineSnapshot(`
      [
        "my ",
        "big",
        " banana is good",
      ]
    `);
  });

  test('1: start ellipsis', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 14, 17, 9)).toMatchInlineSnapshot(`
      [
        "…banana ",
        "is ",
        "good",
      ]
    `);
  });

  test('1: no start ellipsis if big', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 14, 17, 39)).toMatchInlineSnapshot(`
      [
        "my big banana ",
        "is ",
        "good",
      ]
    `);
  });

  test('works if match is at start', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 0, 2, 39)).toMatchInlineSnapshot(`
      [
        "",
        "my",
        " big banana is good",
      ]
    `);
  });

  test('2: works if match is at start', () => {
    const str = 'my big banana is good';
    expect(getMatchFragment(str, 0, 2, 8)).toMatchInlineSnapshot(`
      [
        "",
        "my",
        " big…",
      ]
    `);
  });
});

describe('understands atom node searching', () => {
  const specRegistry = new SpecRegistry([...defaultSpecs(), wikiLink.spec()]);

  const testEditor = renderTestEditor({
    specRegistry,
    plugins: [],
  });

  const makeDoc = (doc: any) => {
    return testEditor(doc).view.state.doc;
  };

  const getResult = async (
    query: string,
    fileData: Array<{ name: string; node: any }>,
  ) => {
    return searchPmNode(
      new AbortController().signal,
      query,
      fileData.map((f) => f.name),
      async (uid) => {
        return fileData.find((r) => r.name === uid)?.node!;
      },
      [
        {
          nodeName: 'wikiLink',
          dataAttrName: 'path',
          printBefore: '[[',
          printAfter: ']]',
          queryIdentifier: 'backlink:',
        },
      ],
    );
  };

  test('list before tag does not show up', async () => {
    const results = await getResult('backlink:awesome-wikiLink', [
      {
        name: '1.md',
        node: makeDoc(
          <doc>
            <para>
              <wikiLink path="sad" />
            </para>
            <ul>
              <li>
                <para>I am a list</para>
              </li>
            </ul>
            <para>
              hello I am a <wikiLink path="awesome-wikiLink" />
            </para>
          </doc>,
        ),
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matches).toEqual([
      {
        match: ['hello I am a ', '[[awesome-wikiLink]]', ''],
        parent: 'paragraph',
        parentPos: 34,
      },
    ]);
  });

  test('soft break in list shows up as a white space', async () => {
    const results = await getResult('backlink:awesome-wikiLink', [
      {
        name: '1.md',

        node: makeDoc(
          <doc>
            <para>
              <wikiLink path="sad" />
            </para>
            <ul>
              <li>
                <para>
                  I am a list{'\n'}
                  hello I am a <wikiLink path="awesome-wikiLink" />{' '}
                </para>
              </li>
            </ul>
          </doc>,
        ),
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matches).toEqual([
      {
        match: ['I am a list\nhello I am a ', '[[awesome-wikiLink]]', ''],
        parent: 'paragraph',
        parentPos: 31,
      },
    ]);
  });

  test('text after shows up', async () => {
    const results = await getResult('backlink:awesome-wikiLink', [
      {
        name: '1.md',
        node: makeDoc(
          <doc>
            <para>
              I am a <wikiLink path="awesome-wikiLink" /> in this small world
            </para>
          </doc>,
        ),
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matches).toEqual([
      {
        match: ['I am a ', '[[awesome-wikiLink]]', ' in this small world'],
        parent: 'paragraph',
        parentPos: 8,
      },
    ]);
  });

  test('shows ellipsis at start', async () => {
    const results = await getResult('backlink:awesome-wikiLink', [
      {
        name: '1.md',
        node: makeDoc(
          <doc>
            <para>
              sas once in the eyes of breath you helplessly want to compare to
              nobody you <wikiLink path="awesome-wikiLink" /> in this small
              world
            </para>
          </doc>,
        ),
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matches).toEqual([
      {
        match: [
          '…as once in the eyes of breath you helplessly want to compare to nobody you ',
          '[[awesome-wikiLink]]',
          ' in this small world',
        ],
        parent: 'paragraph',
        parentPos: 77,
      },
    ]);
  });

  test('renders nearby atom nodes correctly', async () => {
    const results = await getResult('backlink:awesome-wikiLink', [
      {
        name: '1.md',
        node: makeDoc(
          <doc>
            <para>
              I am
              <br /> a <wikiLink path="awesome-wikiLink" /> in this small world
            </para>
          </doc>,
        ),
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matches).toEqual([
      {
        match: ['I am🖼️ a ', '[[awesome-wikiLink]]', ' in this small world'],
        parent: 'paragraph',
        parentPos: 9,
      },
    ]);
  });
});
