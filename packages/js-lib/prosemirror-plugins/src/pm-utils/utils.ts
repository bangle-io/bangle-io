import type { MarkType, Node } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';

export function isStoredMark(state: EditorState, markType: MarkType) {
  return state.storedMarks && markType.isInSet(state.storedMarks);
}

export function findFirstMarkPosition(
  mark: MarkType,
  doc: Node,
  from: number,
  to: number,
) {
  let markPos = { start: -1, end: -1 };
  doc.nodesBetween(from, to, (node, pos) => {
    // stop recursing if result is found
    if (markPos.start > -1) {
      return false;
    }

    if (markPos.start === -1 && mark.isInSet(node.marks)) {
      markPos = {
        start: pos,
        end: pos + Math.max(node.textContent.length, 1),
      };
    }

    return;
  });

  return markPos;
}
