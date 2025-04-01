import {
  EditorState,
  EditorView,
  type PMNode,
  Plugin,
  type ResolvedPos,
  Schema,
  markdownLoader,
} from '@bangle.io/prosemirror-plugins';
import {
  collection,
  createDocument,
  store as editorStore,
  resolve,
  setGlobalConfig,
} from '@bangle.io/prosemirror-plugins';

import type { Store } from '@bangle.io/types';

import type { setupExtensions } from './extensions';

setGlobalConfig({ debug: true });

export function createEditor({
  domNode,
  defaultContent = '',
  onDocChange,
  store,
  extensions,
}: {
  domNode: HTMLElement;
  defaultContent?: string;
  onDocChange?: (doc: string) => void;
  store: Store;
  extensions: ReturnType<typeof setupExtensions>;
}) {
  const resolved = resolve(
    {
      editor: collection({
        id: 'editor',
        plugin: {
          storePlugin: editorStore.storePlugin(store),
        },
      }),
      ...extensions,
      saveDoc: collection({
        id: 'save-doc',
        plugin: {
          saveDoc: new Plugin({
            view() {
              return {
                update(view, prevState) {
                  if (onDocChange && !view.state.doc.eq(prevState.doc)) {
                    const result = markdown.serializer.serialize(
                      view.state.doc,
                    );

                    onDocChange(result);
                  }
                },
              };
            },
          }),
        },
      }),
    },
    false,
    true,
  );

  const schema = new Schema({
    topNode: 'doc',
    nodes: resolved.nodes,
    marks: resolved.marks,
  });

  const markdown = markdownLoader([...Object.values(extensions)], schema);

  const view = new EditorView(
    { mount: domNode },
    {
      state: EditorState.create({
        doc: defaultContent
          ? markdown.parser.parse(defaultContent)
          : createDocument({ schema, content: '' }),
        schema,
        plugins: resolved.resolvePlugins({ schema }),
      }),
    },
  );

  // @ts-expect-error
  globalThis.schema = schema;
  // @ts-expect-error
  globalThis.editorView = view;

  // @ts-expect-error
  globalThis.debugPositions = debugPositions;
  // @ts-expect-error
  globalThis.nodeToXML = nodeToXML;
  // @ts-expect-error
  globalThis.debugDocumentStructure = debugDocumentStructure;
  // @ts-expect-error
  globalThis.printContentBetweenPositions = printContentBetweenPositions;

  return view;
}

/**
 * Logs debug info for each position from 0 to doc.content.size inclusive.
 * For each position, we:
 *   - get the parent node type name
 *   - get the index in that parent
 *   - get the offset within that parent
 *   - optionally get marks, etc.
 *
 * @param {Node} doc - The ProseMirror document to debug.
 */
function debugPositions(doc: PMNode): void {
  console.log(`Debugging positions [0..${doc.content.size}]`);
  for (let pos = 0; pos <= doc.content.size; pos++) {
    const $pos: ResolvedPos = doc.resolve(pos);
    const parentType: string = $pos.parent.type.name;
    const indexInParent: number = $pos.index();
    const parentOffset: number = $pos.parentOffset;

    // For text positions, we can also check if we're "inside" a text node
    let textSnippet = '';
    const textNode: PMNode | null = doc.nodeAt(pos);
    if (textNode?.isText) {
      textSnippet = ` text="${textNode.text?.slice(0, 10)}..."`; // sample up to 10 chars
    }

    console.log(
      `pos=${pos} | parent=${parentType} | index=${indexInParent} | parentOffset=${parentOffset}${textSnippet}`,
    );
  }
}

/**
 * Recursively build an XML-like string representation of the ProseMirror node,
 * along with markers for each position.
 *
 * @param {Node} node     - A ProseMirror node (doc, paragraph, text, etc.).
 * @param {number} offset - The position in the overall document at which `node` starts.
 * @returns {object}      - { xml: string, positionsLine: string, endOffset: number }
 */
function nodeToXML(
  node: PMNode,
  offset = 0,
): {
  xml: string;
  positionsLine: string;
  endOffset: number;
} {
  let positionsLine = '';
  let xml = '';

  // If the node is a text node:
  if (node.isText) {
    // Node text covers positions [offset, offset + node.nodeSize)
    const startPos: number = offset;
    const endPos: number = offset + node.nodeSize; // nodeSize = text length
    // Build a positions line: for each character, we put the position number
    // We might not want to put *every* position number if the text is long,
    // so adapt as needed.
    for (let pos = startPos; pos < endPos; pos++) {
      positionsLine += `${String(pos).padStart(2, ' ')} `;
    }

    // Build an XML-like text node
    xml += `<text>${escapeXml(node.text ?? '')}</text>`;

    return {
      xml,
      positionsLine,
      endOffset: endPos,
    };
  }

  // If it's not a text node, it's likely a block or inline node (e.g. paragraph)
  // Build an opening tag that includes node type, maybe some attributes
  const startPos: number = offset;
  // node.nodeSize includes the node's start/end tokens plus child content
  const endPos: number = offset + node.nodeSize;

  // Mark the start position
  positionsLine += `${String(startPos).padStart(2, ' ')} `;
  xml += `<${node.type.name}>`;

  // Recursively process children
  let childXML = '';
  let currentPos: number = startPos + 1; // +1 for the start token
  let childPositionsLine = '';

  node.forEach((child: PMNode, _offsetInsideNode: number) => {
    // The child's absolute position is currentPos
    const childResult: {
      xml: string;
      positionsLine: string;
      endOffset: number;
    } = nodeToXML(child, currentPos);
    childXML += `\n  ${indent(childResult.xml, 2)}`; // Indent child XML
    childPositionsLine += childResult.positionsLine
      ? `\n${indent(childResult.positionsLine, 2)}`
      : '';
    currentPos = childResult.endOffset; // Move to the next position after the child
  });

  xml += childXML;
  // Mark the end position
  if (endPos - startPos > 1 || node.isText) {
    positionsLine += `${String(endPos).padStart(2, ' ')} `;
  }

  // Add closing tag
  if (childXML) {
    xml += `\n</${node.type.name}>`;
  } else {
    // If no children (like a leaf node), just close on the same line
    xml += `</${node.type.name}>`;
  }

  // Combine position lines
  const combinedPositionsLine: string =
    positionsLine + (childPositionsLine ? `\n${childPositionsLine}` : '');

  return {
    xml,
    positionsLine: combinedPositionsLine,
    endOffset: endPos,
  };
}

// Helper to indent text
function indent(text: string, spaces = 2): string {
  return text
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');
}

/**
 * This function logs the full “map” of positions plus the XML-like node structure.
 *
 * @param {Node} doc - The ProseMirror document to debug.
 */
function debugDocumentStructure(doc: PMNode): void {
  const { xml, positionsLine } = nodeToXML(doc, 0);
  console.log('// Position map');
  console.log(positionsLine);
  console.log('\n// Document structure');
  console.log(xml);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
    }
    return '';
  });
}

/**
 * Prints the content between two consecutive positions in a ProseMirror document.
 *
 * @param {Node} doc - The ProseMirror document.
 * @param {number} from - The starting position (inclusive).
 * @param {number} to - The ending position (exclusive).
 */
/**
 * Prints a console.table representation of the content between two consecutive positions in a ProseMirror document for debugging.
 *
 * @param {Node} doc - The ProseMirror document.
 * @param {number} from - The starting position (inclusive).
 * @param {number} to - The ending position (exclusive).
 */
function printContentBetweenPositions(
  doc: PMNode,
  from = 0,
  to = doc.content.size,
) {
  if (from < 0 || to > doc.content.size || from >= to) {
    console.error('Invalid positions provided.');
    return;
  }

  const tableData = [];
  let index = 0;

  const resolvedFrom = doc.resolve(from);
  const resolvedTo = doc.resolve(to);

  // Handle case where both positions are within the same text node
  if (
    resolvedFrom.parent === resolvedTo.parent &&
    resolvedFrom.parent.isTextblock
  ) {
    tableData.push({
      index: index++,
      type: resolvedFrom.parent.type.name,
      from: from,
      to: to,
      content: `'${resolvedFrom.parent.textBetween(
        from - resolvedFrom.parentOffset,
        to - resolvedTo.parentOffset,
      )}'`,
    });
  } else {
    // Iterate through nodes between the positions
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const start = Math.max(pos, from);
        const end = Math.min(pos + node.nodeSize, to);
        tableData.push({
          index: index++,
          type: 'text',
          from: start,
          to: end,
          content: `'${node.textBetween(start - pos, end - pos)}'`,
        });
      } else if (node.isBlock) {
        if (pos === from) {
          tableData.push({
            index: index++,
            type: node.type.name,
            from: pos,
            to: pos + node.nodeSize,
            content: `<${node.type.name}>`,
          });
        } else if (pos + node.nodeSize === to) {
          tableData.push({
            index: index++,
            type: node.type.name,
            from: pos,
            to: pos + node.nodeSize,
            content: `</${node.type.name}>`,
          });
        } else if (from > pos && to < pos + node.nodeSize) {
          // do nothing its an encapsulating block
        } else if (pos >= from && pos < to) {
          tableData.push({
            index: index++,
            type: node.type.name,
            from: pos,
            to: pos + node.nodeSize,
            content: `<${node.type.name}/>`,
          });
        }
      } else if (node.isInline && !node.isText) {
        if (pos >= from && pos < to) {
          tableData.push({
            index: index++,
            type: node.type.name,
            from: pos,
            to: pos + node.nodeSize,
            content: `<${node.type.name}/>`,
          });
        }
      }

      return true; // Continue iteration
    });
  }

  console.table(tableData);
}
