import type { PMNode } from '@bangle.io/prosemirror-plugins';

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
 * A link reference definition line: `[label]: https://example.com "title"`.
 */
const LINK_DEFINITION = /^[ \t]{0,3}\[[^\]]+\]:[ \t]*<?([^\s>]+)>?/gm;

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
 * Almost everything in Markdown either survives as text or is syntax that is
 * meant to disappear. The exception is the link reference definition: the
 * parser consumes it into its environment and emits nothing, so a definition
 * nothing resolved against is content that vanished silently. A definition that
 * *was* resolved reappears as the href or src it supplied, which is what this
 * looks for.
 *
 * Comparing words instead was tried and is not workable: reference labels,
 * ordered-list numbers and character entities are all syntax that legitimately
 * has no counterpart in the document, so each one had to be special-cased while
 * the check still missed duplicate and structural loss.
 */
export function isMarkdownContentPreserved(
  source: string,
  documentPayload: string,
): boolean {
  for (const [, url] of source.matchAll(LINK_DEFINITION)) {
    if (url && !documentPayload.includes(url)) {
      return false;
    }
  }
  return true;
}

/**
 * Everything a parsed document carries that came from the source text: its
 * text, plus the string attributes holding hrefs, titles, code languages and
 * the like. Used to check an insertion kept the source's content.
 */
export function documentPayload(doc: PMNode): string {
  const parts: string[] = [];
  const collectAttrs = (attrs: Record<string, unknown> | undefined) => {
    if (!attrs) {
      return;
    }
    for (const value of Object.values(attrs)) {
      if (typeof value === 'string') {
        parts.push(value);
      }
    }
  };
  collectAttrs(doc.attrs);
  doc.descendants((node) => {
    if (node.isText && node.text) {
      parts.push(node.text);
    }
    collectAttrs(node.attrs);
    for (const mark of node.marks) {
      collectAttrs(mark.attrs);
    }
    return true;
  });
  return parts.join(' ');
}
