import { describe, expect, test } from 'vitest';
import { matchAllPlus } from '../helpers';

describe('matchAllPlus', () => {
  const mergeStartEnd = (str: string, result: any[]) =>
    result.reduce((prev, cur) => prev + str.slice(cur.start, cur.end), '');

  const mergeSubstrings = (_str: string, result: any[]) =>
    result.reduce((prev, cur) => prev + cur.subString, '');

  test('works when match', () => {
    const result = matchAllPlus(/foo[a-z]*/g, 'baseball  foozball');
    expect(result.map((r) => r.subString)).toMatchInlineSnapshot(`
      [
        "baseball  ",
        "foozball",
      ]
    `);
    expect(result.map((r) => ({ ...r }))).toMatchSnapshot();
  });

  test('works when direct match', () => {
    const result = matchAllPlus(/foo[a-z]*/g, 'foozball');
    expect(result.map((r) => r.subString)).toMatchInlineSnapshot(`
      [
        "foozball",
      ]
    `);
    expect(result.map((r) => ({ ...r }))).toMatchSnapshot();
  });

  test('works when no match', () => {
    const result = matchAllPlus(/foo[a-z]*/g, 'baseball  boozball');
    expect(result.map((r) => r.subString)).toMatchInlineSnapshot(`
      [
        "baseball  boozball",
      ]
    `);
    expect(result.every((r) => r.match === false)).toBe(true);
    expect(result.map((r) => ({ ...r }))).toMatchSnapshot();
  });

  test('works with multiple matches 1', () => {
    const result = matchAllPlus(
      /foo[a-z]*/g,
      'baseball  football foosball gobhi',
    );
    expect(result.map((r) => r.subString)).toMatchInlineSnapshot(`
      [
        "baseball  ",
        "football",
        " ",
        "foosball",
        " gobhi",
      ]
    `);
  });

  test('works with multiple matches 2', () => {
    const result = matchAllPlus(
      /foo[a-z]*/g,
      'baseball  football gobhi tamatar foosball',
    );
    expect(result.map((r) => r.subString)).toMatchInlineSnapshot(`
      [
        "baseball  ",
        "football",
        " gobhi tamatar ",
        "foosball",
      ]
    `);
    expect(result.map((r) => r.match)).toMatchInlineSnapshot(`
      [
        false,
        true,
        false,
        true,
      ]
    `);
  });

  test.each([
    ['hello https://google.com two https://bangle.io', 2],
    ['hello https://google.com https://bangle.io', 2],
    ['https://google.com https://bangle.io', 2],
    ['https://google.com t https://bangle.io ', 2],
    ['https://google.com 🙆‍♀️ https://bangle.io 👯‍♀️', 2],
    ['hello https://google.com two s', 1],
    ["hello https://google.com'", 1],
    ["hello https://google.com' two", 1],
  ])(
    '%# string start and end positions should be correct',
    (string, matchCount) => {
      const result = matchAllPlus(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
        string,
      );

      expect(result.filter((r) => r.match)).toHaveLength(matchCount);

      expect(mergeStartEnd(string, result)).toBe(string);
    },
  );

  test('1 misc cases', () => {
    const regex = /t(e)(st(\d?))/g;
    const string = 'test1test2';
    const result = matchAllPlus(regex, string);

    expect(mergeStartEnd(string, result)).toBe(string);
    expect(mergeSubstrings(string, result)).toBe(string);

    expect(result).toMatchInlineSnapshot(`
      [
        MatchType {
          "_sourceString": "test1test2",
          "end": 5,
          "match": true,
          "start": 0,
        },
        MatchType {
          "_sourceString": "test1test2",
          "end": 10,
          "match": true,
          "start": 5,
        },
      ]
    `);
  });

  test('2 misc cases', () => {
    const regex = /(#\w+)/g;
    const string = 'Hello #world #planet!';
    const result = matchAllPlus(regex, string);
    expect(mergeStartEnd(string, result)).toBe(string);

    expect(result).toMatchInlineSnapshot(`
      [
        MatchType {
          "_sourceString": "Hello #world #planet!",
          "end": 6,
          "match": false,
          "start": 0,
        },
        MatchType {
          "_sourceString": "Hello #world #planet!",
          "end": 12,
          "match": true,
          "start": 6,
        },
        MatchType {
          "_sourceString": "Hello #world #planet!",
          "end": 13,
          "match": false,
          "start": 12,
        },
        MatchType {
          "_sourceString": "Hello #world #planet!",
          "end": 20,
          "match": true,
          "start": 13,
        },
        MatchType {
          "_sourceString": "Hello #world #planet!",
          "end": 21,
          "match": false,
          "start": 20,
        },
      ]
    `);
  });
});
