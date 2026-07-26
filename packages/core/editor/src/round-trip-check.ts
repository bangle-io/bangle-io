/**
 * Decides whether the editor can round-trip a note's Markdown without
 * rewriting it. `source` is the exact text read from storage; `serialized`
 * is the freshly parsed document serialized back through the same
 * serializer the save path uses.
 *
 * Only benign, unavoidable differences are tolerated: CRLF line endings
 * (ProseMirror documents are LF-only) and trailing whitespace at the end of
 * the file. Any other difference means the first save after an edit would
 * rewrite parts of the note the user never touched — the caller should
 * surface that to the user instead of letting it happen silently.
 */
export function isMarkdownRoundTripPreserved(
  source: string,
  serialized: string,
): boolean {
  return normalizeForComparison(source) === normalizeForComparison(serialized);
}

function normalizeForComparison(markdown: string): string {
  return markdown.replace(/\r\n?/g, '\n').replace(/\s+$/u, '');
}

/**
 * Words of two or more characters, which is what the content check compares.
 * Single characters are skipped because Markdown syntax is full of them — the
 * `X` of a `- [X]` task, the `1` of `1)` — and they carry no content of their
 * own.
 */
const CONTENT_WORD = /[\p{L}\p{N}]{2,}/gu;

/**
 * Decides whether parsing `source` kept everything the user can see.
 *
 * This is the test for *inserting* Markdown, where {@link
 * isMarkdownRoundTripPreserved} is the wrong question: that one is a byte
 * comparison, so it rejects pure normalization — `*italic*` becoming
 * `_italic_`, `* item` becoming `- item`, a setext heading becoming `#`. None
 * of that loses anything, and the same normalization happens to text the user
 * simply types.
 *
 * What must not happen is content disappearing, such as a link reference
 * definition the parser drops on the floor. So compare the words of the source
 * against everything the parsed document carries — its text plus the string
 * attributes holding hrefs, titles, languages and the like.
 */
export function isMarkdownContentPreserved(
  source: string,
  documentPayload: string,
): boolean {
  const words = source.match(CONTENT_WORD);
  if (!words) {
    return true;
  }
  const payload = documentPayload.toLowerCase();
  return words.every((word) => payload.includes(word.toLowerCase()));
}
