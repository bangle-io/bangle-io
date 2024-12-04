// fuzzySearch.ts

/**
 * A function type for fuzzy search algorithms.
 */
export type FuzzySearchFunction = (needle: string, haystack: string) => boolean;

/**
 * A function type for scoring functions.
 */
export type ScoringFunction = (needle: string, haystack: string) => number;

/**
 * Options for the rankedFuzzySearch function.
 */
export interface FuzzySearchOptions {
  /**
   * Fuzzy search function to use. Defaults to defaultFuzzySearch.
   */
  fuzzySearchFunction?: FuzzySearchFunction;

  /**
   * Scoring function. Defaults to defaultScoringFunction.
   */
  scoringFunction?: ScoringFunction;
}

/**
 * The default fuzzy search function. Checks if all characters in the needle
 * appear in the haystack in order.
 *
 * @param needle - The search string.
 * @param haystack - The string to search within.
 * @returns True if the needle matches the haystack fuzzily.
 */
function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function defaultFuzzySearch(needle: string, haystack: string): boolean {
  const needleNorm = normalizeString(needle);
  const haystackNorm = normalizeString(haystack);

  // Update length variables in case normalization changes string length
  const nlen = needleNorm.length;
  const hlen = haystackNorm.length;

  if (nlen === 0) {
    return true;
  }
  if (nlen > hlen) {
    return false;
  }
  if (nlen === hlen) {
    return needleNorm === haystackNorm;
  }

  let i = 0; // Index for needleNorm
  let j = 0; // Index for haystackNorm

  while (i < nlen && j < hlen) {
    if (needleNorm[i] === haystackNorm[j]) {
      i++;
    }
    j++;
  }

  return i === nlen;
}

/**
 * A substring fuzzy search function. Checks if the needle is a substring of the haystack.
 *
 * @param needle - The search string.
 * @param haystack - The string to search within.
 * @returns True if the needle is a substring of the haystack.
 */
export function substringFuzzySearch(
  needle: string,
  haystack: string,
): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * A Levenshtein-based fuzzy search function. Considers strings matching if the
 * Levenshtein distance is within a threshold.
 *
 * @param needle - The search string.
 * @param haystack - The string to search within.
 * @returns True if the Levenshtein distance is within the threshold.
 */
export function levenshteinFuzzySearch(
  needle: string,
  haystack: string,
): boolean {
  const distance = levenshteinDistance(
    normalizeString(needle),
    normalizeString(haystack),
  );
  // Define a threshold for matching (adjust as needed)
  const threshold = Math.floor(Math.max(needle.length, haystack.length) * 0.4);
  return distance <= threshold;
}

/**
 * Performs a ranked fuzzy search over an array of strings.
 *
 * @param needle - The search string.
 * @param haystacks - The array of strings to search within.
 * @param options - Optional parameters to configure the search.
 * @returns An array of matched items with their scores, sorted by score.
 */
export function rankedFuzzySearch(
  needle: string,
  haystacks: string[],
  options: FuzzySearchOptions = {},
): { item: string; score: number }[] {
  const {
    fuzzySearchFunction = defaultFuzzySearch,
    scoringFunction = defaultScoringFunction,
  } = options;

  return haystacks
    .map((haystack) => {
      const isMatch = fuzzySearchFunction(needle, haystack);
      if (!isMatch) {
        return null;
      }
      const score = scoringFunction(needle, haystack);
      return { item: haystack, score };
    })
    .filter(
      (result): result is { item: string; score: number } => result !== null,
    )
    .sort((a, b) => b.score - a.score);
}

/**
 * The default scoring function. Scores based on match position and length.
 *
 * @param needle - The search string.
 * @param haystack - The string to score.
 * @returns A score between 0 and 1.
 */
export function defaultScoringFunction(
  needle: string,
  haystack: string,
): number {
  const needleNorm = normalizeString(needle);
  const haystackNorm = normalizeString(haystack);

  if (needleNorm === haystackNorm) {
    return 1; // Maximum score for exact match
  }

  let score = 0;
  let haystackIndex = 0;

  for (let i = 0; i < needleNorm.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const char = needleNorm[i]!;
    haystackIndex = haystackNorm.indexOf(char, haystackIndex);
    if (haystackIndex === -1) {
      return 0;
    }
    // Higher score for matches closer to the start
    score += 1 / (haystackIndex + 1);
    haystackIndex++;
  }

  // Adjust the score to favor longer needles and normalize between 0 and 1
  const lengthRatio = needleNorm.length / haystackNorm.length;
  return (score / needleNorm.length) * lengthRatio;
}
/**
 * A Levenshtein-based scoring function. Scores based on normalized Levenshtein distance.
 *
 * @param needle - The search string.
 * @param haystack - The string to score.
 * @returns A score between 0 and 1.
 */
export function levenshteinScoringFunction(
  needle: string,
  haystack: string,
): number {
  const distance = levenshteinDistance(
    normalizeString(needle),
    normalizeString(haystack),
  );
  const maxLength = Math.max(needle.length, haystack.length);
  return 1 - distance / maxLength;
}

/**
 * Computes the Levenshtein distance between two strings.
 *
 * @param a - The first string.
 * @param b - The second string.
 * @returns The Levenshtein distance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aNorm = normalizeString(a);
  const bNorm = normalizeString(b);

  const aLen = aNorm.length;
  const bLen = bNorm.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  if (!matrix[0]) {
    matrix[0] = [];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  // Compute distances
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (bNorm.charAt(i - 1) === aNorm.charAt(j - 1)) {
        // @ts-expect-error
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // @ts-expect-error

        matrix[i][j] = Math.min(
          // @ts-expect-error

          matrix[i - 1][j - 1] + 1, // substitution
          // @ts-expect-error
          matrix[i][j - 1] + 1, // insertion
          // @ts-expect-error

          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }
  // @ts-expect-error
  return matrix[bLen][aLen];
}
