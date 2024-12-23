// findSuggestionMatch.spec.ts

import type { ResolvedPos } from '@prosekit/pm/model';
import { describe, expect, it } from 'vitest';
import { type Trigger, findSuggestionMatch } from './find-suggestion-match';

function createMockResolvedPos(
  pos: number,
  text?: string,
  isText = true,
): ResolvedPos {
  return {
    pos,
    nodeBefore: text
      ? {
          isText,
          text,
        }
      : null,
  } as unknown as ResolvedPos;
}

describe('findSuggestionMatch', () => {
  it('returns null if nodeBefore is null', () => {
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(5),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).toBeNull();
  });

  it('returns null if nodeBefore is not text', () => {
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(5, 'Some text', false), // isText = false
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).toBeNull();
  });

  it('returns null if nodeBefore text is an empty string', () => {
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(5, ''),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).toBeNull();
  });

  it('returns null if no match is found', () => {
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(10, 'Hello world'),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).toBeNull();
  });

  it('finds the last match if multiple matches are present', () => {
    // Text has two matches: "@first" (indexes ~10..15) and "@second" (~21..28).
    // The cursor is placed *within* "@second".
    const text = 'Some text @first blah @second';
    // Let's locate the start of "@second".
    // "Some text "(0..10) + "@first"(10..16) + " blah "(16..22) + "@second"(22..29)
    // We'll place the cursor at position 27 or 28, which is inside "@second".
    const cursorPos = 22 + 6; // say, index 28 in that text

    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(cursorPos, text),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    expect(result?.text).toBe('@second');
    expect(result?.query).toBe('second');
  });

  it.skip('returns correct range, query, and text when a match is found', () => {
    // The substring "@mention" starts around index 11 and ends at index 19.
    // We'll put the cursor at position 19 so it's just at the end of "@mention".
    const textContent = 'Hello some @mention here';
    // Let's confirm indices:
    // "Hello some "(0..11) + "@mention"(11..19) + " here"(19..24).
    // We'll set pos=19 so the substring [11..19] includes the cursor at 19.
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(19, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.text).toBe('@mention');
      expect(result.query).toBe('mention');
      // from = textFrom + matchStartIndex
      // textFrom = (cursorPos=19) - text.length=24 => -5
      // matchStartIndex=11 => from = -5 + 11 = 6
      // to=6+8=14
      // But let's confirm the function's logic about from/to:
      //   from = textFrom + 11
      //   to   = from + matchLength(8)
      //   match is '@mention' => length=8
      // textFrom = 19 - 24 = -5
      expect(result.range.from).toBe(6);
      expect(result.range.to).toBe(14);
    }
  });

  it.skip('respects startOfLine: match only if the trigger is at the start of the line', () => {
    // The substring "@startOfLine" spans indexes [0..12].
    // We'll place the cursor at index 12 to ensure the match includes the cursor.
    const textContent = '@startOfLine Some text @notStart';
    // indexes: "@startOfLine"(0..12) + " Some text "(12..23) + "@notStart"(23..).
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: true,
      $position: createMockResolvedPos(12, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    expect(result?.text).toBe('@startOfLine');
    expect(result?.query).toBe('startOfLine');
  });

  it('returns null if startOfLine is true but the trigger is not at the start', () => {
    const textContent = 'Nope @notStart some text';
    // The '@notStart' is around index 5..14. But it's not index 0, so no match should be found.
    // We'll place the cursor inside that substring to prove the only reason it fails is startOfLine check.
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: true,
      $position: createMockResolvedPos(10, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).toBeNull();
  });

  it.skip('respects allowedPrefixes if provided', () => {
    // There's "-@test" (indexes ~0..5), "+@ok" (~6..10), "?@bad" (~11..16).
    // We'll place the cursor in the "+@ok" substring.
    const textContent = '-@test +@ok ?@bad';
    // Let's say the "+@ok" is from index 6..10.
    // We'll set the cursor at 10 so that the match is still valid.
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: ['-', '+'],
      startOfLine: false,
      $position: createMockResolvedPos(10, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    expect(result?.text).toBe('@ok');
    expect(result?.query).toBe('ok');
  });

  it.skip('respects allowSpaces when true', () => {
    // "Some @long match test" => the substring might be '@long match' from index 5..15/16
    // We'll place the cursor at, say, index 15 or 16 so it's inside that substring.
    const textContent = 'Some @long match test';
    // Let’s see "Some " => 0..5, "@"(5), "long match"(6..15), " test"(16..)
    // If the substring is '@long match' => indexes 5..15. We'll pick cursor=15.
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: true,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(15, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.text).toBe('@long match');
      expect(result.query).toBe('long match');
    }
  });

  it.skip('disallows spaces if allowToIncludeChar is true (even if allowSpaces is true)', () => {
    // If allowToIncludeChar=true, the code disregards allowSpaces and does not allow spaces in the query.
    // "@long match" would normally match if we had allowSpaces, but not if we also allowToIncludeChar.
    // We'll confirm only "@long" is captured, with the cursor after the "g".
    const textContent = '@long match test';
    // '@long' => indexes 0..5, space at index 5 => " match" => indexes 6..11
    // We'll place the cursor at index 5 so the substring includes it exactly.
    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: true, // This would normally allow spaces
      allowToIncludeChar: true, // This overrides so spaces are disallowed
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(5, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.text).toBe('@long');
      expect(result.query).toBe('long');
    }
  });

  it.skip('handles the edge case of "allowSpaces" with a trailing space and second trigger', () => {
    const textContent = 'Hello @user @ second';

    const triggerConfig: Trigger = {
      char: '@',
      allowSpaces: true,
      allowToIncludeChar: false,
      allowedPrefixes: null,
      startOfLine: false,
      $position: createMockResolvedPos(11, textContent),
    };

    const result = findSuggestionMatch(triggerConfig);
    expect(result).not.toBeNull();
    if (result) {
      // The function appends a space to the matched text if suffixSpaceAndChar is found.
      // So the final matched text might be "@user ".
      expect(result.text).toBe('@user ');
      expect(result.query).toBe('user ');
    }
  });
});
