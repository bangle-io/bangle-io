import {
  type PMNode,
  type Selection,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';

/** Returns the text cursor position to remember for a note. */
export function getRememberedCursorPosition(
  selection: Selection,
): number | undefined {
  return selection instanceof TextSelection ? selection.head : undefined;
}

/** Resolves a remembered document position to a safe text cursor. */
export function resolveRememberedCursor(
  doc: PMNode,
  position: number,
): TextSelection | undefined {
  const clampedPosition = Math.max(
    0,
    Math.min(Math.trunc(position), doc.content.size),
  );
  const selection = TextSelection.near(doc.resolve(clampedPosition));
  return selection instanceof TextSelection ? selection : undefined;
}
