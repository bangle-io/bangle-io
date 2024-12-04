import { describe, expect, it } from 'vitest';
import {
  FuzzySearchFunction,
  type ScoringFunction,
  defaultFuzzySearch,
  defaultScoringFunction,
  levenshteinDistance,
  levenshteinFuzzySearch,
  levenshteinScoringFunction,
  rankedFuzzySearch,
  substringFuzzySearch,
} from '..';

describe('defaultFuzzySearch', () => {
  it('returns true when the needle is empty', () => {
    expect(defaultFuzzySearch('', 'haystack')).toBe(true);
  });

  it('returns true when needle matches haystack exactly (case-insensitive)', () => {
    expect(defaultFuzzySearch('abc', 'abc')).toBe(true);
    expect(defaultFuzzySearch('ABC', 'abc')).toBe(true);
  });

  it('returns true when needle characters are in haystack in order', () => {
    expect(defaultFuzzySearch('abc', 'aXbYcZ')).toBe(true);
  });

  it('returns false when needle characters are not in haystack in order', () => {
    expect(defaultFuzzySearch('abc', 'acb')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(defaultFuzzySearch('aBc', 'A_B_C')).toBe(true);
  });

  it('returns false when needle characters are not in haystack at all', () => {
    expect(defaultFuzzySearch('abc', 'def')).toBe(false);
  });

  it('handles Unicode characters', () => {
    expect(defaultFuzzySearch('ü', 'Über')).toBe(true);
  });

  it('handles special characters correctly', () => {
    expect(defaultFuzzySearch('h-t', 'hello-test')).toBe(true);
    expect(defaultFuzzySearch('h_t', 'hello_test')).toBe(true);
  });

  it('handles spaces correctly', () => {
    expect(defaultFuzzySearch('hd', 'hello world')).toBe(true);
    expect(defaultFuzzySearch('hw', 'hello world')).toBe(true);
  });
});

describe('substringFuzzySearch', () => {
  it('returns true when needle is a substring', () => {
    expect(substringFuzzySearch('app', 'apple')).toBe(true);
    expect(substringFuzzySearch('APP', 'apple')).toBe(true);
  });

  it('returns false when needle is not a substring', () => {
    expect(substringFuzzySearch('xyz', 'apple')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(substringFuzzySearch('', 'apple')).toBe(true);
    expect(substringFuzzySearch('apple', '')).toBe(false);
  });
});

describe('rankedFuzzySearch', () => {
  const items = ['apple', 'apricot', 'banana', 'grape', 'orange', 'pineapple'];

  it('returns ranked results using default algorithm and scoring function', () => {
    const results = rankedFuzzySearch('app', items);
    expect(results).toEqual([
      { item: 'apple', score: expect.any(Number) },
      { item: 'pineapple', score: expect.any(Number) },
    ]);

    // Ensure scores are ordered
    expect(results?.[0]?.score).toBeGreaterThanOrEqual(
      results?.[1]?.score ?? -1,
    );
  });

  it('returns ranked results using Levenshtein algorithm and scoring function', () => {
    const results = rankedFuzzySearch('apple', items, {
      fuzzySearchFunction: levenshteinFuzzySearch,
      scoringFunction: levenshteinScoringFunction,
    });
    expect(results?.[0]?.item).toBe('apple');
    expect(results?.[0]?.score).toBeCloseTo(1);
  });

  it('allows custom scoring functions', () => {
    const customScoringFunction: ScoringFunction = (needle, haystack) => {
      return haystack.toLowerCase().includes(needle.toLowerCase()) ? 1 : 0;
    };
    const results = rankedFuzzySearch('ap', items, {
      scoringFunction: customScoringFunction,
    });
    expect(results).toEqual([
      { item: 'apple', score: 1 },
      { item: 'apricot', score: 1 },
      { item: 'grape', score: 1 },
      { item: 'pineapple', score: 1 },
    ]);
  });

  it('returns empty array when no matches found', () => {
    const results = rankedFuzzySearch('zz', items);
    expect(results).toEqual([]);
  });

  it('handles empty needle', () => {
    const results = rankedFuzzySearch('', items);
    expect(results.length).toBe(items.length);
  });

  it('uses custom fuzzySearchFunction when algorithm is custom', () => {
    const customFuzzySearchFunction = (needle: string, haystack: string) => {
      // Match only if haystack starts with needle
      return haystack.toLowerCase().startsWith(needle.toLowerCase());
    };

    const results = rankedFuzzySearch('ap', items, {
      fuzzySearchFunction: customFuzzySearchFunction,
    });
    expect(results).toEqual([
      { item: 'apple', score: expect.any(Number) },
      { item: 'apricot', score: expect.any(Number) },
    ]);
  });

  it('handles array with empty strings', () => {
    const items = ['', 'apple', '', 'banana'];
    const results = rankedFuzzySearch('a', items);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.item)).toEqual(['apple', 'banana']);
  });

  it('preserves original case in results', () => {
    const items = ['Apple', 'BANANA', 'apricot'];
    const results = rankedFuzzySearch('a', items);
    expect(results.map((r) => r.item)).toEqual(['Apple', 'apricot', 'BANANA']);
  });
});

describe('levenshteinDistance', () => {
  it('calculates correct distance between strings', () => {
    const distance = levenshteinDistance('kitten', 'sitting');
    expect(distance).toBe(3);
  });
});

describe('levenshteinScoringFunction', () => {
  it('calculates correct score', () => {
    const score = levenshteinScoringFunction('kitten', 'sitting');
    const expectedScore = 1 - 3 / 7; // distance / maxLength
    expect(score).toBeCloseTo(expectedScore);
  });
});

describe('defaultScoringFunction', () => {
  it('gives higher score to earlier matches', () => {
    const score1 = defaultScoringFunction('app', 'apple');

    const score2 = defaultScoringFunction('app', 'pineapple');

    expect(score1).toBeGreaterThan(score2);
  });

  it('returns 0 for non-matching strings', () => {
    expect(defaultScoringFunction('xyz', 'apple')).toBe(0);
  });

  it('scores exact matches higher', () => {
    const exactScore = defaultScoringFunction('apple', 'apple');
    const partialScore = defaultScoringFunction('app', 'apple');
    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('scores case-insensitive matches equally', () => {
    const score1 = defaultScoringFunction('app', 'apple');
    const score2 = defaultScoringFunction('APP', 'apple');
    expect(score1).toBe(score2);
  });
});

describe('Unicode and special characters', () => {
  const items = ['über', 'café', 'résumé', 'naïve'];

  it('handles Unicode in defaultFuzzySearch', () => {
    expect(defaultFuzzySearch('ub', 'über')).toBe(true);
    expect(defaultFuzzySearch('caf', 'café')).toBe(true);
  });

  it('handles Unicode in rankedFuzzySearch', () => {
    const results = rankedFuzzySearch('ca', items);
    expect(results?.[0]?.item).toBe('café');
  });

  it('handles diacritics in scoring', () => {
    const score = defaultScoringFunction('cafe', 'café');
    expect(score).toBeGreaterThan(0);
  });
});

describe('Fuzzy Search Functions', () => {
  describe('defaultFuzzySearch', () => {
    it('should return true for exact matches', () => {
      expect(defaultFuzzySearch('apple', 'apple')).toBe(true);
    });

    it('should return true for fuzzy matches with characters in order', () => {
      expect(defaultFuzzySearch('apl', 'apple')).toBe(true);
    });

    it('should return false if characters are not in order', () => {
      expect(defaultFuzzySearch('pal', 'apple')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(defaultFuzzySearch('Apple', 'aPPle')).toBe(true);
    });

    it('should handle empty needle', () => {
      expect(defaultFuzzySearch('', 'apple')).toBe(true);
    });

    it('should handle empty haystack', () => {
      expect(defaultFuzzySearch('apple', '')).toBe(false);
    });

    it('should handle diacritics correctly', () => {
      expect(defaultFuzzySearch('cafe', 'café')).toBe(true);
    });
  });

  describe('substringFuzzySearch', () => {
    it('should return true for exact matches', () => {
      expect(substringFuzzySearch('apple', 'apple')).toBe(true);
    });

    it('should return true for substring matches', () => {
      expect(substringFuzzySearch('app', 'apple')).toBe(true);
    });

    it('should return false for non-substring matches', () => {
      expect(substringFuzzySearch('apl', 'apple')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(substringFuzzySearch('Apple', 'aPPle')).toBe(true);
    });

    it('should handle empty needle', () => {
      expect(substringFuzzySearch('', 'apple')).toBe(true);
    });

    it('should handle empty haystack', () => {
      expect(substringFuzzySearch('apple', '')).toBe(false);
    });
  });

  describe('levenshteinFuzzySearch', () => {
    it('should return true for exact matches', () => {
      expect(levenshteinFuzzySearch('apple', 'apple')).toBe(true);
    });

    it('should return true for matches within threshold', () => {
      expect(levenshteinFuzzySearch('appl', 'apple')).toBe(true);
      expect(levenshteinFuzzySearch('aple', 'apple')).toBe(true);
    });

    it('should handle empty needle', () => {
      expect(levenshteinFuzzySearch('', 'apple')).toBe(false);
    });

    it('should handle empty haystack', () => {
      expect(levenshteinFuzzySearch('apple', '')).toBe(false);
    });
  });
});

describe('Scoring Functions', () => {
  describe('defaultScoringFunction', () => {
    it('should assign maximum score for exact match', () => {
      const score = defaultScoringFunction('apple', 'apple');
      expect(score).toBe(1);
    });

    it('should assign higher score to better matches', () => {
      const score1 = defaultScoringFunction('apple', 'apple');
      const score2 = defaultScoringFunction('appl', 'apple');
      const score3 = defaultScoringFunction('app', 'apple');
      expect(score1).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score3);
    });

    it('should assign zero score for no match', () => {
      const score = defaultScoringFunction('xyz', 'apple');
      expect(score).toBe(0);
    });

    it('should favor matches at the start', () => {
      const score1 = defaultScoringFunction('app', 'apple');
      const score2 = defaultScoringFunction('ple', 'apple');
      expect(score1).toBeGreaterThan(score2);
    });

    it('scores exact matches higher than partial matches', () => {
      const exactScore = defaultScoringFunction('apple', 'apple');
      const partialScore = defaultScoringFunction('app', 'apple');
      expect(exactScore).toBeGreaterThan(partialScore);
    });
  });

  describe('levenshteinScoringFunction', () => {
    it('should assign maximum score for exact match', () => {
      const score = levenshteinScoringFunction('apple', 'apple');
      expect(score).toBe(1);
    });

    it('should assign higher score to closer matches', () => {
      const score1 = levenshteinScoringFunction('appl', 'apple');
      const score2 = levenshteinScoringFunction('apxle', 'apple');
      expect(score1).toBeGreaterThanOrEqual(score2);
    });

    it('should assign zero score when completely different', () => {
      const score = levenshteinScoringFunction('xyz', 'apple');
      expect(score).toBeCloseTo(0, 1);
    });
  });
});

describe('rankedFuzzySearch', () => {
  const haystacks = ['apple', 'application', 'banana', 'grape', 'pineapple'];

  it('should return matched items with scores', () => {
    const results = rankedFuzzySearch('app', haystacks);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      expect(result).toHaveProperty('item');
      expect(result).toHaveProperty('score');
    });
  });

  it('should return matched items with scores', () => {
    const results = rankedFuzzySearch('your', [
      'i-ll-love-your-shining-lights.md',
      'my-favourite-things.md',
      'if-you-want-to-share.md',
      'know-your-amphetamines.md',
      'so-you-want-to-talk-about-race.md',
      'agora-youtube-integration.md',
      'choose-your-own-adventure.md',
      'a-bicycle-for-our-minds.md',
      'cant-break-your-heart.md',
    ]);
    expect(results.length).toBeGreaterThan(0);
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "item": "my-favourite-things.md",
          "score": 0.039953102453102456,
        },
        {
          "item": "if-you-want-to-share.md",
          "score": 0.02909992372234935,
        },
        {
          "item": "know-your-amphetamines.md",
          "score": 0.021825396825396828,
        },
        {
          "item": "so-you-want-to-talk-about-race.md",
          "score": 0.019809203142536477,
        },
        {
          "item": "agora-youtube-integration.md",
          "score": 0.015320294784580498,
        },
        {
          "item": "choose-your-own-adventure.md",
          "score": 0.015250721500721503,
        },
        {
          "item": "a-bicycle-for-our-minds.md",
          "score": 0.014281674208144798,
        },
        {
          "item": "cant-break-your-heart.md",
          "score": 0.01243131868131868,
        },
        {
          "item": "i-ll-love-your-shining-lights.md",
          "score": 0.010081064768564768,
        },
      ]
    `);
  });

  it('should rank exact matches higher', () => {
    const results = rankedFuzzySearch('apple', haystacks);
    expect(results?.[0]?.item).toBe('apple');
  });

  it('should handle different fuzzy search functions', () => {
    const haystacks = ['apple', 'application', 'banana'];

    const resultsDefault = rankedFuzzySearch('appl', haystacks, {
      fuzzySearchFunction: defaultFuzzySearch,
    });
    const resultsSubstring = rankedFuzzySearch('appl', haystacks, {
      fuzzySearchFunction: substringFuzzySearch,
    });
    const resultsLevenshtein = rankedFuzzySearch('appl', haystacks, {
      fuzzySearchFunction: levenshteinFuzzySearch,
    });

    expect(resultsDefault.length).toBeGreaterThan(0);
    expect(resultsSubstring.length).toBeGreaterThan(0);
    expect(resultsLevenshtein.length).toBeGreaterThan(0);
  });

  it('should use custom fuzzy search and scoring functions', () => {
    const customFuzzySearch = (needle: string, haystack: string): boolean => {
      return haystack.startsWith(needle);
    };
    const customScoringFunction = (
      needle: string,
      haystack: string,
    ): number => {
      return needle.length / haystack.length;
    };
    const results = rankedFuzzySearch('app', haystacks, {
      fuzzySearchFunction: customFuzzySearch,
      scoringFunction: customScoringFunction,
    });
    expect(results.length).toBe(2);
    expect(results?.[0]?.item).toBe('apple');
  });
});

describe('Normalization Function', () => {
  it('should remove diacritics and convert to lowercase', () => {
    const normalizeString = (str: string): string =>
      str.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

    expect(normalizeString('Café')).toBe('cafe');
    expect(normalizeString('São Paulo')).toBe('sao paulo');
    expect(normalizeString('naïve')).toBe('naive');
  });
});

describe('Levenshtein Distance Function', () => {
  it('should return zero for identical strings', () => {
    const distance = levenshteinDistance('apple', 'apple');
    expect(distance).toBe(0);
  });

  it('should return correct distance for different strings', () => {
    const distance = levenshteinDistance('apple', 'aple');
    expect(distance).toBe(1);
  });

  it('should handle empty strings', () => {
    const distance = levenshteinDistance('', 'apple');
    expect(distance).toBe(5);
  });

  it('should be symmetric', () => {
    const dist1 = levenshteinDistance('apple', 'aple');
    const dist2 = levenshteinDistance('aple', 'apple');
    expect(dist1).toBe(dist2);
  });
});

describe('Edge Cases', () => {
  it('should handle needle longer than haystack', () => {
    expect(defaultFuzzySearch('pineapple', 'apple')).toBe(false);
    expect(substringFuzzySearch('pineapple', 'apple')).toBe(false);
    expect(levenshteinFuzzySearch('pineapple', 'apple')).toBe(false);
  });

  it('should return empty results when no matches found', () => {
    const results = rankedFuzzySearch('xyz', ['apple', 'banana']);
    expect(results.length).toBe(0);
  });

  it('should correctly handle multiple haystacks with similar matches', () => {
    const haystacks = ['testing', 'test', 'tester', 'tested', 'taste'];
    const results = rankedFuzzySearch('test', haystacks);
    expect(results.map((r) => r.item)).toEqual([
      'test',
      'tester',
      'tested',
      'testing',
    ]);
  });
});
