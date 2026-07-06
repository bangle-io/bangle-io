import type MarkdownIt from 'markdown-it';

/**
 * Parsed form of a `[[wiki link]]`: `target` is the linked note and `label` is
 * the optional display text following a `|`. This is engine-neutral data — the
 * shared meaning of the syntax, with no editor dependency — so both editor
 * engines resolve and render `[[…]]` from the same source of truth.
 */
export type WikiLinkAttrs = {
  target: string;
  label: string | null;
};

const INVALID_WIKI_LINK_TARGET_CHARS = /[[\]\n|]/;
const INVALID_WIKI_LINK_LABEL_CHARS = /[[\]\n]/;

/**
 * Parses the inside of `[[…]]` into {@link WikiLinkAttrs}, or `null` when the
 * content is not a valid wiki link (empty target, or a target/label containing
 * characters that could not survive a round trip).
 */
export function parseWikiLinkContent(content: string): WikiLinkAttrs | null {
  const separator = content.indexOf('|');
  const target = separator < 0 ? content : content.slice(0, separator);
  const label = separator < 0 ? null : content.slice(separator + 1);
  if (
    !target ||
    INVALID_WIKI_LINK_TARGET_CHARS.test(target) ||
    (label !== null && INVALID_WIKI_LINK_LABEL_CHARS.test(label))
  ) {
    return null;
  }
  return { target, label };
}

/**
 * Serializes {@link WikiLinkAttrs} back to `[[target|label]]` markup, or `null`
 * when the attributes could not form a valid wiki link. Serialization is
 * validated through {@link parseWikiLinkContent} so it can never emit markup
 * that would fail to re-parse.
 */
export function serializeWikiLinkAttrs(attrs: WikiLinkAttrs): string | null {
  return parseWikiLinkContent(
    `${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}`,
  )
    ? `[[${attrs.target}${attrs.label === null ? '' : `|${attrs.label}`}]]`
    : null;
}

/**
 * markdown-it inline plugin that tokenizes `[[target|label]]` into a `wiki_link`
 * token whose `meta` carries the parsed {@link WikiLinkAttrs}.
 *
 * Registered before the `escape` rule so a leading backslash (`\[[…]]`) still
 * escapes the construct, and it declines inside an active link context or when
 * the brackets are unbalanced, so ordinary `[link]` and `[[nested` text is left
 * untouched.
 */
export function wikiLinkTokenizer(md: MarkdownIt): void {
  md.inline.ruler.before('escape', 'wiki_link', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '[[') {
      return false;
    }
    if ((state as { linkLevel?: number }).linkLevel) {
      return false;
    }
    const prefix = state.src.slice(0, start);
    if (prefix.lastIndexOf('[') > prefix.lastIndexOf(']')) {
      return false;
    }
    if (prefix.lastIndexOf('[[') > prefix.lastIndexOf(']]')) {
      return false;
    }
    const end = state.src.indexOf(']]', start + 2);
    if (end < 0) {
      return false;
    }
    const content = state.src.slice(start + 2, end);
    if (content.includes('[[')) {
      return false;
    }
    const attrs = parseWikiLinkContent(content);
    if (!attrs) {
      return false;
    }

    if (!silent) {
      const token = state.push('wiki_link', '', 0);
      token.meta = attrs;
    }
    state.pos = end + 2;
    return true;
  });
}
