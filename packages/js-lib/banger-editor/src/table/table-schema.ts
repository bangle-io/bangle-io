import { tableNodes } from '../pm';
import { parseAlign, type RequiredConfig } from './table-config';

export function createTableNodes(config: RequiredConfig) {
  const nodes = tableNodes({
    tableGroup: config.tableGroup,
    // Inline-only cells keep the document representable as Markdown pipe
    // tables; block content inside cells has no faithful pipe-table form.
    cellContent: 'inline*',
    cellAttributes: {
      align: {
        default: null,
        getFromDOM: (dom) => parseAlign(dom.style.textAlign),
        setDOMAttr: (value, attrs) => {
          const align = parseAlign(value);
          if (align) {
            attrs.style = `${attrs.style ?? ''}text-align: ${align};`;
          }
        },
      },
    },
  });

  // Inline-content cells are textblocks, which makes the positions between
  // cells valid gap-cursor spots by prosemirror-gapcursor's default rule.
  // A gap cursor inside a row is never meaningful, so forbid it.
  nodes.table_row = { ...nodes.table_row, allowGapCursor: false };

  return nodes;
}
