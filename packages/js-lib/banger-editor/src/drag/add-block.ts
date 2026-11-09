import type { EditorView } from '../pm';
import { TextSelection } from '../pm';
import { type GlobalDragHandlePluginOptions, nodePosAtDOM } from './helpers';

/**
 * Inserts an empty paragraph next to the block rendered by `blockDom` —
 * after it by default, before it when `above` is set — and places the cursor
 * inside the new paragraph.
 */
export function addBlockNextTo(
  view: EditorView,
  blockDom: Element,
  { above }: { above: boolean },
  options: Required<GlobalDragHandlePluginOptions>,
): boolean {
  const rawPos = nodePosAtDOM(blockDom, view, options);
  if (rawPos == null || rawPos < 0) {
    return false;
  }
  return insertParagraphNear(view, rawPos, { above });
}

/**
 * Inserts an empty paragraph as a sibling of the block around `rawPos`.
 *
 * The insertion point is found by walking up from the resolved position to
 * the closest depth whose parent accepts a paragraph there. Inserting must
 * never go through ProseMirror's slice fitting (`tr.insert` at an invalid
 * position), which "fits" the content by splitting the surrounding node —
 * that is how a paragraph forced into a table tears it in two. Positions
 * inside tables or isolating nodes climb out first, so the paragraph lands
 * before/after the whole structure instead.
 *
 * Returns false (leaving the document untouched) when no valid spot exists,
 * e.g. above a frontmatter block that must stay first in the document.
 */
export function insertParagraphNear(
  view: EditorView,
  rawPos: number,
  { above }: { above: boolean },
): boolean {
  const { state } = view;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType || rawPos > state.doc.content.size) {
    return false;
  }
  const $pos = state.doc.resolve(rawPos);

  let startDepth = $pos.depth;
  for (let depth = 1; depth <= $pos.depth; depth++) {
    const ancestor = $pos.node(depth);
    if (ancestor.type.spec.tableRole || ancestor.type.spec.isolating) {
      startDepth = depth - 1;
      break;
    }
  }

  for (let depth = startDepth; depth >= 0; depth--) {
    const parent = $pos.node(depth);
    const index = $pos.index(depth);
    const base = $pos.posAtIndex(index, depth);

    // Reuse an adjacent empty paragraph instead of stacking new ones, so
    // repeated "+" clicks land in the same empty block.
    const neighborIndex = above ? index - 1 : index + 1;
    const neighbor =
      neighborIndex >= 0 && neighborIndex < parent.childCount
        ? parent.child(neighborIndex)
        : null;
    if (
      neighbor &&
      neighbor.type === paragraphType &&
      neighbor.content.size === 0
    ) {
      const neighborStart = above
        ? base - neighbor.nodeSize
        : base + (index < parent.childCount ? parent.child(index).nodeSize : 0);
      const tr = state.tr
        .setSelection(TextSelection.near(state.doc.resolve(neighborStart + 1)))
        .scrollIntoView();
      view.focus();
      view.dispatch(tr);
      return true;
    }

    const insertIndex = above ? index : Math.min(index + 1, parent.childCount);
    if (!parent.canReplaceWith(insertIndex, insertIndex, paragraphType)) {
      continue;
    }

    const paragraph = paragraphType.createAndFill();
    if (!paragraph) {
      return false;
    }

    const insertPos = above
      ? base
      : base + (index < parent.childCount ? parent.child(index).nodeSize : 0);

    let tr = state.tr.insert(insertPos, paragraph);
    tr = tr
      .setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)))
      .scrollIntoView();
    view.focus();
    view.dispatch(tr);
    return true;
  }
  return false;
}
