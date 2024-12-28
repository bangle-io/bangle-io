import type { MarkType, Node } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';

export function clampRange(
  start: number,
  end: number,
  docSize: number,
): [number, number] {
  return [Math.max(0, start), Math.min(end, docSize)];
}
export interface MarkScanResult {
  start: number;
  end: number;
  text?: string; // the text content within the mark
}

export function isStoredMark(state: EditorState, markType: MarkType): boolean {
  return !!(state.storedMarks && markType.isInSet(state.storedMarks));
}

export function findFirstMarkPosition(
  markType: MarkType,
  doc: Node,
  from: number,
  to: number,
): MarkScanResult | null {
  const [startPos, endPos] = clampRange(from, to, doc.content.size);
  let result: MarkScanResult | null = null;
  let accumulatedText = '';
  let withinMark = false;
  let markStart = -1;
  let markEnd = -1;

  doc.nodesBetween(startPos, endPos, (node, pos) => {
    if (result) {
      return false;
    }

    // We only care about text nodes for text content,
    // but a node can have the mark set even if it’s not a text node.
    if (markType.isInSet(node.marks)) {
      if (!withinMark) {
        withinMark = true;
        markStart = pos;
      }
      markEnd = pos + node.nodeSize;
      if (node.isText) {
        accumulatedText += node.textContent;
      }
      return false;
    }

    return undefined;
  });

  if (withinMark) {
    result = { start: markStart, end: markEnd };
    if (accumulatedText) {
      result.text = accumulatedText;
    }
  }

  return result;
}
