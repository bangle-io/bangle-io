import type { MarkType, PMNode } from '../pm';
import type { EditorState } from '../pm';

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
  // Quick check for stored marks. Typically used to decide if a user is "in" a mark during typing.
  return !!(state.storedMarks && markType.isInSet(state.storedMarks));
}

export function findFirstMarkPosition(
  markType: MarkType,
  doc: PMNode,
  from: number,
  to: number,
): MarkScanResult | null {
  // Potential improvement: If multiple marks exist, you might want to track them all, not just the first.
  const [startPos, endPos] = clampRange(from, to, doc.content.size);
  let result: MarkScanResult | null = null;
  let accumulatedText = '';
  let withinMark = false;
  let markStart = -1;
  let markEnd = -1;

  doc.nodesBetween(startPos, endPos, (node, pos) => {
    if (result) {
      // We found our first mark, so we stop further scanning.
      return false;
    }

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
