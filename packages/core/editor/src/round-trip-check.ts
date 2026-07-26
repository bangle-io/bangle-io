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

/** Attributes that hold a link or image target. */
const LINK_TARGET_ATTRS = ['href', 'src'] as const;

/**
 * Every link and image target the parsed document points at.
 *
 * Deliberately only these attributes: comparing against the document's prose as
 * well would let an unrelated mention of the same text vouch for a definition
 * that was actually dropped.
 */
export function collectLinkTargets(doc: PMNode): ReadonlySet<string> {
  const targets = new Set<string>();
  const collect = (attrs: Record<string, unknown> | undefined) => {
    if (!attrs) {
      return;
    }
    for (const name of LINK_TARGET_ATTRS) {
      const value = attrs[name];
      if (typeof value === 'string' && value) {
        targets.add(value);
      }
    }
  };
  doc.descendants((node) => {
    collect(node.attrs);
    for (const mark of node.marks) {
      collect(mark.attrs);
    }
    return true;
  });
  return targets;
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
 * Almost everything in Markdown either survives as text or is syntax that is
 * meant to disappear. The exception is the link reference definition: the
 * parser consumes it into its environment and emits nothing, so a definition
 * nothing resolved against is content that vanished silently. A definition that
 * *was* resolved becomes the target of a link or image, which is what this
 * looks for — after the parser's own percent-encoding, or a URL holding an
 * accent or a reserved character would look lost when it is merely encoded.
 */
export function isMarkdownContentPreserved(
  source: string,
  linkTargets: ReadonlySet<string>,
): boolean {
  for (const [, url] of source.matchAll(LINK_DEFINITION)) {
    if (!url) {
      continue;
    }
    if (linkTargets.has(url)) {
      continue;
    }
    let encoded: string | undefined;
    try {
      encoded = encodeURI(url);
    } catch {
      encoded = undefined;
    }
    if (!encoded || !linkTargets.has(encoded)) {
      return false;
    }
  }
  return true;
}
