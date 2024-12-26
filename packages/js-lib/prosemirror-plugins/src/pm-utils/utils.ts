import type { MarkType, Node } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';

export function isStoredMark(state: EditorState, markType: MarkType) {
  return state.storedMarks && markType.isInSet(state.storedMarks);
}

interface MarkPosition {
  start: number;
  end: number;
}

/**
 * Finds the position of the first occurrence of a mark in a document between the given positions.
 *
 * @param markType - The mark type to search for
 * @param doc - The ProseMirror document node to search in
 * @param searchStart - The starting position to search from (inclusive)
 * @param searchEnd - The ending position to search to (inclusive)
 * @returns A MarkPosition object with start and end positions, or null if no mark is found
 */
export function findFirstMarkPosition(
  markType: MarkType,
  doc: Node,
  searchStart: number,
  _searchEnd: number,
): MarkPosition | null {
  let markPos: MarkPosition | null = null;

  if (searchStart < 0) {
    return null;
  }

  const searchEnd = Math.min(_searchEnd, doc.content.size);

  doc.nodesBetween(searchStart, searchEnd, (node, pos) => {
    if (markPos) {
      return false;
    }

    if (markType.isInSet(node.marks)) {
      markPos = {
        start: pos,
        end: pos + Math.max(node.textContent.length, 1),
      };
      return false;
    }

    return;
  });

  return markPos;
}
