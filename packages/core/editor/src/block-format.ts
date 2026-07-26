import {
  type Command,
  type EditorState,
  liftTarget,
  type NodeType,
  type PMNode,
} from '@bangle.io/prosemirror-plugins';

const FRONTMATTER_NODE_NAME = 'frontmatter';

/**
 * Textblocks that store their text verbatim: code blocks and YAML frontmatter.
 *
 * Reformatting these as prose is destructive — it drops the fence, language or
 * delimiters and collapses the newlines inside them — so the block-format
 * commands step over them instead of rewriting the user's source.
 */
function holdsLiteralText(node: PMNode): boolean {
  return (
    node.type.spec.code === true || node.type.name === FRONTMATTER_NODE_NAME
  );
}

/**
 * Start positions of the textblocks in the selection that a block command may
 * rewrite, skipping the literal-text ones.
 */
function formattableBlockPositions(state: EditorState): number[] {
  const positions: number[] = [];
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) {
      return true;
    }
    if (!holdsLiteralText(node)) {
      positions.push(pos);
    }
    return false;
  });
  return positions;
}

/**
 * A position just inside the first and last formattable blocks of the
 * selection.
 *
 * Lifting needs positions inside the content, not the selection's own
 * endpoints: a select-all reports the document's boundaries, whose block range
 * is the document itself, so nothing would ever be lifted out of a list.
 */
function innerRange(
  state: EditorState,
  positions: number[],
): { from: number; to: number } | undefined {
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (first === undefined || last === undefined) {
    return undefined;
  }
  const lastNode = state.doc.nodeAt(last);
  if (!lastNode) {
    return undefined;
  }
  return { from: first + 1, to: last + lastNode.nodeSize - 1 };
}

/**
 * Walks the formattable textblocks in the selection, letting the caller decide
 * per block. Literal-text blocks never reach `visit`, and a document with only
 * those reports `false`.
 */
function everyFormattableBlock(
  state: EditorState,
  visit: (node: PMNode, parent: PMNode | null) => boolean,
): boolean {
  const { from, to } = state.selection;
  let sawBlock = false;
  let all = true;
  state.doc.nodesBetween(from, to, (node, _pos, parent) => {
    if (!node.isTextblock) {
      // Stop descending once the answer is settled.
      return all;
    }
    if (holdsLiteralText(node)) {
      return false;
    }
    sawBlock = true;
    if (!visit(node, parent)) {
      all = false;
    }
    return false;
  });
  return sawBlock && all;
}

/**
 * Whether every formattable block in the selection is a paragraph sitting
 * directly under the document — the goal state of {@link setParagraphInSelection}
 * and what the Paragraph control reports as active.
 */
export function isSelectionAllTopLevelParagraphs(state: EditorState): boolean {
  const paragraph = state.schema.nodes.paragraph;
  if (!paragraph) {
    return false;
  }
  const topType = state.schema.topNodeType;
  return everyFormattableBlock(
    state,
    (node, parent) => node.type === paragraph && parent?.type === topType,
  );
}

/**
 * Whether every formattable block in the selection is a heading of `level`.
 * This looks at the whole selection rather than just its head, so a mixed
 * selection reports inactive regardless of which end it was started from.
 */
export function isSelectionAllHeadings(
  state: EditorState,
  level: number,
): boolean {
  const heading = state.schema.nodes.heading;
  if (!heading) {
    return false;
  }
  return everyFormattableBlock(
    state,
    (node) => node.type === heading && node.attrs.level === level,
  );
}

/**
 * Retypes every formattable block in the selection in a single transaction.
 * Blocks the schema will not retype in place (a heading inside a table cell,
 * say) are left as they are, so the command reports `false` when nothing
 * changed and callers can present it as unavailable.
 */
function convertSelectionToBlockType(
  type: NodeType,
  attrs?: Record<string, unknown>,
): Command {
  return (state, dispatch) => {
    const positions = formattableBlockPositions(state);
    if (positions.length === 0) {
      return false;
    }
    const tr = state.tr;
    for (const pos of positions) {
      const mapped = tr.mapping.map(pos);
      const node = tr.doc.nodeAt(mapped);
      if (!node?.isTextblock) {
        continue;
      }
      // `setBlockType` takes a position inside the block and skips blocks the
      // schema refuses, so an ineligible block simply stays put.
      tr.setBlockType(mapped + 1, mapped + 1, type, attrs);
    }
    if (!tr.docChanged) {
      return false;
    }
    if (dispatch) {
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * Turns the whole selection into plain top-level paragraphs: retypes headings
 * and other blocks, then lifts the selected range out of every list and
 * blockquote wrapping it.
 *
 * Both halves share one transaction. Doing this as a sequence of separate
 * commands re-read the live selection between steps, and lifting a list
 * collapses that selection to a cursor — which silently left the rest of the
 * user's selection half-converted, and persisted the intermediate document.
 */
export const setParagraphInSelection: Command = (state, dispatch) => {
  const paragraph = state.schema.nodes.paragraph;
  if (!paragraph) {
    return false;
  }
  const positions = formattableBlockPositions(state);
  if (positions.length === 0) {
    return false;
  }

  const tr = state.tr;
  const bounds = innerRange(state, positions);

  for (const pos of positions) {
    const mapped = tr.mapping.map(pos);
    const node = tr.doc.nodeAt(mapped);
    if (node?.isTextblock && node.type !== paragraph) {
      tr.setBlockType(mapped + 1, mapped + 1, paragraph);
    }
  }

  // Lift the still-nested blocks one group at a time, tracking the user's range
  // through the transaction rather than re-reading the selection (which the
  // lifts would collapse). Lifting the range as a whole is not enough: as soon
  // as one block reaches the top level the range's common ancestor is the
  // document, which would strand the blocks still inside a list.
  const topType = state.schema.topNodeType;
  // Every pass must lift a group, which strictly reduces nesting, so the node
  // count is a safe upper bound. A fixed depth cap instead stopped partway
  // through legitimately deep Markdown and left the rest wrapped.
  let remainingPasses = tr.doc.nodeSize;
  while (bounds && remainingPasses > 0) {
    remainingPasses -= 1;
    const from = tr.mapping.map(bounds.from);
    const to = tr.mapping.map(bounds.to);
    let nestedPos: number | undefined;
    tr.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (nestedPos !== undefined) {
        return false;
      }
      if (!node.isTextblock) {
        return true;
      }
      if (!holdsLiteralText(node) && parent && parent.type !== topType) {
        nestedPos = pos;
      }
      return false;
    });
    if (nestedPos === undefined) {
      break;
    }
    const range = tr.doc.resolve(nestedPos + 1).blockRange();
    const target = range ? liftTarget(range) : null;
    if (!range || target === null) {
      break;
    }
    const stepsBefore = tr.steps.length;
    tr.lift(range, target);
    // Stop if a lift reported success without changing anything, rather than
    // spinning until the bound runs out.
    if (tr.steps.length === stepsBefore) {
      break;
    }
  }

  if (!tr.docChanged) {
    return false;
  }
  if (dispatch) {
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * Applies `level` to the whole selection, or clears it back to paragraphs when
 * the selection is already entirely that heading. Clearing deliberately does
 * not lift, so toggling a heading off inside a list keeps the list.
 */
export function toggleHeadingInSelection(level: number): Command {
  return (state, dispatch, view) => {
    const { heading, paragraph } = state.schema.nodes;
    if (!heading || !paragraph) {
      return false;
    }
    if (isSelectionAllHeadings(state, level)) {
      return convertSelectionToBlockType(paragraph)(state, dispatch, view);
    }
    return convertSelectionToBlockType(heading, { level })(
      state,
      dispatch,
      view,
    );
  };
}
