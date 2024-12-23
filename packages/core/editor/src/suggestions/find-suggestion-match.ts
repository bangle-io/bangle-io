import type { ResolvedPos } from '@prosekit/pm/model';

type Range = {
  from: number;
  to: number;
};

/**
 * Escapes special characters in a string so it can safely be used in a regular expression.
 * Source: https://stackoverflow.com/a/6969486
 */
function escapeForRegEx(string: string): string {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Configuration for finding suggestion triggers within a ProseMirror document.
 */
export interface Trigger {
  /** The character that triggers the suggestion. */
  char: string;
  /** Whether to allow spaces in the suggestion query. */
  allowSpaces: boolean;
  /** Whether to allow the trigger character to be included in the suggestion query. */
  allowToIncludeChar: boolean;
  /**
   * A list of allowed prefixes before the trigger character.
   * If null, any prefix is allowed.
   */
  allowedPrefixes: string[] | null;
  /** Whether the trigger must be at the start of a line. */
  startOfLine: boolean;
  /** The resolved position in the document to search from. */
  $position: ResolvedPos;
}

/**
 * Represents a suggestion match found within a ProseMirror document.
 */
export type SuggestionMatch = {
  /** The range of the matched text in the document. */
  range: Range;
  /** The query part of the match (excluding the trigger character). */
  query: string;
  /** The full matched text, including the trigger character. */
  text: string;
} | null;

/**
 * Finds a suggestion match based on the provided configuration and document position.
 * Returns a SuggestionMatch if found; otherwise null.
 */
export function findSuggestionMatch(config: Trigger): SuggestionMatch {
  const {
    char,
    allowSpaces: allowSpacesOption,
    allowToIncludeChar,
    allowedPrefixes,
    startOfLine,
    $position,
  } = config;

  // If we're allowing the trigger character inside the query, we don't allow spaces there.
  const allowSpaces = allowSpacesOption && !allowToIncludeChar;
  const escapedChar = escapeForRegEx(char);

  // Regex to detect if there's a space followed immediately by the trigger character.
  // Used to handle the "between two triggers" edge case when allowSpaces is true.
  const suffixSpaceAndChar = new RegExp(`\\s${escapedChar}$`);

  // We only anchor the match at the start of the line if startOfLine is true.
  const prefix = startOfLine ? '^' : '';

  // Characters to exclude while building the query.
  // If allowToIncludeChar is true, we exclude nothing special;
  // otherwise exclude whitespace and the trigger itself.
  const excludedChars = allowToIncludeChar ? '' : `\\s${escapedChar}`;

  // Build the main regex for finding matches:
  //  1) If spaces are allowed, match non-greedily until we see excludedChars or the end-of-string.
  //  2) Otherwise, match any characters except whitespace or the trigger character.
  const regexp = allowSpaces
    ? new RegExp(`${prefix}${escapedChar}.*?(?=[${excludedChars}]|$)`, 'gm')
    : new RegExp(`${prefix}${escapedChar}[^\\s${escapedChar}]*`, 'gm');

  // We only look for matches in the text node before the cursor.
  const nodeBefore = $position.nodeBefore;
  if (!nodeBefore || !nodeBefore.isText) {
    return null;
  }

  const text = nodeBefore.text;
  if (!text) {
    return null;
  }

  // The position in the overall document where this text node starts.
  const textFrom = $position.pos - text.length;

  // Gather all matches, then pop the last one (which is nearest the cursor).
  const match = Array.from(text.matchAll(regexp)).pop();

  if (!match?.input === undefined || match?.index === undefined) {
    return null;
  }

  const matchStartIndex = match.index;
  const matchEndIndex = matchStartIndex + match[0].length;

  // Check whether the match is allowed by prefix constraints or the startOfLine requirement.
  // We'll look at the character immediately before the match:
  const prefixBeforeMatch = text.slice(
    Math.max(0, matchStartIndex - 1),
    matchStartIndex,
  );

  // Decide if the prefix is acceptable or if the match sits at the very start of the line.
  const isAllowedPrefix =
    allowedPrefixes === null || allowedPrefixes.includes(prefixBeforeMatch);
  const isStartOfLineMatch = startOfLine && matchStartIndex === 0;

  // If a specific set of prefixes is enforced and neither condition is met, no match.
  if (allowedPrefixes !== null && !isAllowedPrefix && !isStartOfLineMatch) {
    return null;
  }

  // Translate match indices into absolute document positions.
  const from = textFrom + matchStartIndex;
  let to = textFrom + matchEndIndex;

  // Handle the edge case when spaces are allowed and we might be directly between triggers:
  // If the match ends in a space + the trigger char, extend by one to capture that space.
  if (
    allowSpaces &&
    suffixSpaceAndChar.test(text.slice(matchEndIndex - 1, matchEndIndex + 1))
  ) {
    // Include the space in the matched text so that the returned `text` is accurate.
    match[0] += ' ';
    to += 1;
  }

  // Only return if the cursor is currently within the boundaries of this match.
  if (from < $position.pos && to >= $position.pos) {
    return {
      range: { from, to },
      query: match[0].slice(char.length), // the query part excludes the trigger char
      text: match[0],
    };
  }

  return null;
}
