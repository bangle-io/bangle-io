import type { MarkdownSerializerState } from 'prosemirror-markdown';
import type { CollectionType } from '../common';
import type { PMNode } from '../pm';
import { parseAlign, type TableCellAlign } from './table-config';

/**
 * The Markdown side of the table extension. This module is on the save path:
 * a bug here rewrites notes, so every normalization choice below is covered
 * by round-trip tests in `packages/core/editor/src/__tests__/`.
 */
export function tableMarkdown(): CollectionType['markdown'] {
  return {
    nodes: {
      table: {
        toMarkdown: tableToMarkdown,
        parseMarkdown: {
          table: { block: 'table' },
          thead: { ignore: true },
          tbody: { ignore: true },
        },
      },
      table_row: {
        // Rows are serialized by the table node above.
        toMarkdown: () => {},
        parseMarkdown: {
          tr: { block: 'table_row' },
        },
      },
      table_header: {
        toMarkdown: () => {},
        parseMarkdown: {
          th: {
            block: 'table_header',
            getAttrs: (tok) => ({
              align: alignFromToken(tok.attrGet('style')),
            }),
          },
        },
      },
      table_cell: {
        toMarkdown: () => {},
        parseMarkdown: {
          td: {
            block: 'table_cell',
            getAttrs: (tok) => ({
              align: alignFromToken(tok.attrGet('style')),
            }),
          },
        },
      },
    },
    tokenizerPlugins: [
      (md) => {
        md.enable('table');
        // GFM cells hold line breaks as literal <br>. The tokenizer runs
        // with html disabled, so <br> arrives as plain text; convert it to
        // hardbreak tokens, but only inside table cells so <br> text in
        // normal paragraphs keeps round-tripping as text.
        //
        // This must run before 'text_join': at that point escaped (\<br>)
        // and entity (&lt;br&gt;) forms are still separate 'text_special'
        // tokens, so matching only 'text' tokens converts exactly the raw
        // occurrences and leaves intentional literals alone.
        md.core.ruler.before('text_join', 'table-cell-br', (state) => {
          let cellDepth = 0;
          for (const token of state.tokens) {
            if (token.type === 'th_open' || token.type === 'td_open') {
              cellDepth++;
            } else if (token.type === 'th_close' || token.type === 'td_close') {
              cellDepth--;
            } else if (
              cellDepth > 0 &&
              token.type === 'inline' &&
              token.children
            ) {
              token.children = splitBrIntoHardbreaks(
                token.children,
                state.Token,
              );
            }
          }
        });
      },
    ],
  };
}

const CELL_BR_RE = /<br\s*\/?>/i;

function splitBrIntoHardbreaks<
  T extends { type: string; content: string; level: number },
>(children: T[], TokenCtor: new (type: string, tag: string, nesting: 0) => T) {
  const result: T[] = [];
  for (const child of children) {
    if (child.type !== 'text' || !CELL_BR_RE.test(child.content)) {
      result.push(child);
      continue;
    }
    const parts = child.content.split(new RegExp(CELL_BR_RE.source, 'gi'));
    parts.forEach((part, index) => {
      if (part) {
        const text = new TokenCtor('text', '', 0);
        text.content = part;
        text.level = child.level;
        result.push(text);
      }
      if (index < parts.length - 1) {
        const br = new TokenCtor('hardbreak', 'br', 0);
        br.level = child.level;
        result.push(br);
      }
    });
  }
  return result;
}

function alignFromToken(style: string | null): TableCellAlign | null {
  const match = style?.match(/text-align:\s*(left|center|right)/);
  return parseAlign(match?.[1]);
}

function tableToMarkdown(state: MarkdownSerializerState, node: PMNode) {
  // Flush pending block separation now, so the captured cell output below
  // cannot swallow the "\n\n" that belongs between the previous block and
  // this table.
  state.write();

  const rows: string[][] = [];
  const aligns: (TableCellAlign | null)[] = [];

  node.forEach((row, _offset, rowIndex) => {
    const cells: string[] = [];
    row.forEach((cell) => {
      if (rowIndex === 0) {
        aligns.push(parseAlign(cell.attrs.align));
      }
      cells.push(serializeCellInline(state, cell));
    });
    rows.push(cells);
  });

  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const pad = (row: string[]): string[] =>
    row.length >= columnCount
      ? row
      : [...row, ...Array.from({ length: columnCount - row.length }, () => '')];

  const toLine = (cells: string[]) => `| ${cells.join(' | ')} |`;

  // The first row always serializes as the header because pipe tables
  // require one; if header cells were deleted the first body row is
  // promoted on the next parse.
  const lines = [
    toLine(pad(rows[0] ?? [])),
    toLine(
      Array.from({ length: columnCount }, (_, column) =>
        delimiterForAlign(aligns[column] ?? null),
      ),
    ),
    ...rows.slice(1).map((row) => toLine(pad(row))),
  ];

  lines.forEach((line, index) => {
    state.write(line);
    // The last line must not end with a newline; closeBlock owns the
    // separation from the next block, like every other block serializer.
    if (index < lines.length - 1) {
      state.ensureNewLine();
    }
  });

  state.closeBlock(node);
}

function delimiterForAlign(align: TableCellAlign | null): string {
  switch (align) {
    case 'left':
      return ':---';
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    default:
      return '---';
  }
}

// MarkdownSerializerState keeps its output buffer in fields that are not part
// of the public typings. Capturing them is the only way to reuse the shared
// inline mark/node serializers for cell content instead of a lossy
// `textContent` dump.
type SerializerInternals = {
  out: string;
  delim: string;
  closed: PMNode | null;
  atBlockStart: boolean;
};

function serializeCellInline(
  state: MarkdownSerializerState,
  cell: PMNode,
): string {
  const internals = state as MarkdownSerializerState & SerializerInternals;
  const previous = {
    out: internals.out,
    delim: internals.delim,
    closed: internals.closed,
    atBlockStart: internals.atBlockStart,
    escapeExtraCharacters: state.options.escapeExtraCharacters,
  };
  internals.out = '';
  internals.delim = '';
  internals.closed = null;
  // Literal `<` in cell text must be escaped, otherwise text that looks
  // like <br> parses back as a line break. esc() only runs for text nodes,
  // so code spans keep their raw form — mirroring the parser, which only
  // converts <br> inside plain text tokens.
  state.options.escapeExtraCharacters = previous.escapeExtraCharacters
    ? new RegExp(`${previous.escapeExtraCharacters.source}|<`, 'g')
    : /</g;

  let raw: string;
  try {
    state.renderInline(cell);
    raw = internals.out;
  } finally {
    internals.out = previous.out;
    internals.delim = previous.delim;
    internals.closed = previous.closed;
    internals.atBlockStart = previous.atBlockStart;
    state.options.escapeExtraCharacters = previous.escapeExtraCharacters;
  }

  return (
    raw
      // Hard breaks persist as <br>, the GFM convention for line breaks in
      // pipe-table cells; any other raw newline would terminate the row, so
      // it flattens to a space.
      .replace(/\\\n/g, '<br>')
      .replace(/\n+/g, ' ')
      // GFM expects pipes escaped everywhere in a cell, including inside
      // inline code spans.
      .replace(/\|/g, '\\|')
      .trim()
  );
}
