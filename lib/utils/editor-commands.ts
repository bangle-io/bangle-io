import type { Command } from '@bangle.dev/pm';

/**
 * Trims any whitespace before the cursor
 */
export function trimEndWhiteSpaceBeforeCursor(): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) {
      return false;
    }
    const nodeBefore = state.selection.$from.nodeBefore;
    const nodeAfter = state.selection.$from.nodeAfter;

    // if nodeAfter exists the selection is not at the end
    if (nodeAfter) {
      return false;
    }
    const textBefore = nodeBefore?.text;

    if (textBefore && nodeBefore.type.name === 'text') {
      const whiteSpaceChars = textBefore.length - textBefore.trimEnd().length;

      if (whiteSpaceChars > 0) {
        dispatch?.(
          state.tr.delete(
            state.selection.from - whiteSpaceChars,
            state.selection.from,
          ),
        );

        return true;
      }
    }

    return false;
  };
}
