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
 * Words of two or more characters, which is what the content check compares.
 * Single characters are skipped because Markdown syntax is full of them — the
 * `X` of a `- [X]` task, the `1` of `1)` — and they carry no content of their
 * own.
 */
const CONTENT_WORD = /[\p{L}\p{N}]{2,}/gu;

/** An ordered-list marker at the start of a line: `1.`, `10)`. */
const ORDERED_MARKER = /^[ \t]*\d+[.)](?=[ \t])/gm;

/** A named, decimal or hex character entity. */
const HTML_ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

/**
 * The words a piece of Markdown actually says, with the syntax that legitimately
 * disappears on parse removed first:
 *
 * - ordered-list numbers, which are not stored on the node at all (the
 *   serializer always writes `1.`), so a list of ten or more items would
 *   otherwise look like it lost the number of its tenth
 * - character entities, which decode to punctuation, so `&amp;` is an `&` and
 *   the letters "amp" were never content
 */
function contentWords(markdown: string): string[] {
  return (
    markdown
      .replace(ORDERED_MARKER, ' ')
      .replace(HTML_ENTITY, ' ')
      .toLowerCase()
      .match(CONTENT_WORD) ?? []
  );
}

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
  // Whole words rather than substrings, so a word that really was dropped
  // cannot be excused by a longer surviving word that happens to contain it.
  const surviving = new Set(contentWords(documentPayload));
  return contentWords(source).every((word) => surviving.has(word));
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
