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
