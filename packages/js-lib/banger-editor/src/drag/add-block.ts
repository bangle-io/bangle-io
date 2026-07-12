import type { EditorView } from '../pm';
import { TextSelection } from '../pm';
import {
  calcNodePos,
  type GlobalDragHandlePluginOptions,
  nodePosAtDOM,
} from './helpers';

/**
 * Inserts an empty paragraph as a sibling of the block rendered by
 * `blockDom` — after it by default, before it when `above` is set — and
 * places the cursor inside the new paragraph.
 *
 * Returns false (and leaves the document untouched) when the position cannot
 * be resolved or the schema forbids a paragraph at that boundary (e.g.
 * above a frontmatter block).
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
  const pos = calcNodePos(rawPos, view.state);
  const node = view.state.doc.nodeAt(pos);
  if (!node) {
    return false;
  }

  const paragraph = view.state.schema.nodes.paragraph?.createAndFill();
  if (!paragraph) {
    return false;
  }

  const insertPos = above ? pos : pos + node.nodeSize;
  let tr: typeof view.state.tr;
  try {
    tr = view.state.tr.insert(insertPos, paragraph);
  } catch {
    return false;
  }
  tr = tr
    .setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)))
    .scrollIntoView();
  view.focus();
  view.dispatch(tr);
  return true;
}
