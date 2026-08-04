import type MarkdownIt from 'markdown-it';

export type CalloutTokenMetadata = {
  markerOnOwnLine: boolean;
  calloutType: string;
};

const CALLOUT_MARKER =
  /^\[!([A-Za-z][A-Za-z\d_-]*)\](?: (?=[^ \t\r\n])|(?=\r?\n|$))/u;
const CALLOUT_TYPE = /^[A-Za-z][A-Za-z\d_-]*$/u;

/** Serializes a validated callout type back to its marker. */
export function serializeCalloutMarker(calloutType: string): string | null {
  return CALLOUT_TYPE.test(calloutType) ? `[!${calloutType}]` : null;
}

/** Reads callout metadata attached to a blockquote token. */
export function readCalloutTokenMetadata(
  metadata: unknown,
): CalloutTokenMetadata | null {
  if (typeof metadata !== 'object' || metadata === null) {
    return null;
  }
  const calloutType = (metadata as { calloutType?: unknown }).calloutType;
  const markerOnOwnLine = (metadata as { markerOnOwnLine?: unknown })
    .markerOnOwnLine;
  return typeof calloutType === 'string' && calloutType
    ? { calloutType, markerOnOwnLine: markerOnOwnLine !== false }
    : null;
}

/**
 * Opt-in Obsidian-style `> [!type]` callouts.
 *
 * The marker is removed from the first paragraph and carried on the opening
 * blockquote token. Its remaining inline source is reparsed so marks and links
 * in the callout body keep their ordinary Markdown meaning.
 */
export function calloutTokenizer(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'callout', (state) => {
    for (let index = 0; index < state.tokens.length - 2; index += 1) {
      const open = state.tokens[index];
      const paragraph = state.tokens[index + 1];
      const inline = state.tokens[index + 2];
      if (
        open?.type !== 'blockquote_open' ||
        paragraph?.type !== 'paragraph_open' ||
        paragraph.level !== open.level + 1 ||
        inline?.type !== 'inline' ||
        inline.level !== paragraph.level + 1
      ) {
        continue;
      }

      const match = CALLOUT_MARKER.exec(inline.content);
      const calloutType = match?.[1];
      if (!match || !calloutType) {
        continue;
      }

      open.meta = {
        ...(typeof open.meta === 'object' && open.meta !== null
          ? open.meta
          : {}),
        calloutType,
        markerOnOwnLine:
          inline.content[match[0].length] === '\n' ||
          inline.content[match[0].length] === '\r' ||
          inline.content.length === match[0].length,
      } satisfies CalloutTokenMetadata;

      let content = inline.content.slice(match[0].length);
      if (content.startsWith('\r\n')) {
        content = content.slice(2);
      } else if (content.startsWith('\n')) {
        content = content.slice(1);
      }
      inline.content = content;
      inline.children = [];
      state.md.inline.parse(content, state.md, state.env, inline.children);

      const paragraphClose = state.tokens[index + 3];
      const nextBlock = state.tokens[index + 4];
      const markerEndLine = paragraph.map?.[1];
      const nextBlockStartLine = nextBlock?.map?.[0];
      const markerEndsImmediatelyBeforeNextBlock =
        content === '' &&
        typeof markerEndLine === 'number' &&
        markerEndLine === nextBlockStartLine &&
        paragraphClose?.type === 'paragraph_close' &&
        nextBlock !== undefined &&
        nextBlock.level === paragraph.level &&
        nextBlock.type !== 'blockquote_close';
      if (markerEndsImmediatelyBeforeNextBlock) {
        // The marker is metadata, not an empty editable paragraph. Markdown-it
        // emits one when a marker-only line is followed directly by a list,
        // heading, fence, or nested quote. Keeping that token triple would add
        // a visible blank block and serialize an extra quoted blank line.
        state.tokens.splice(index + 1, 3);
      }
    }
  });
}
