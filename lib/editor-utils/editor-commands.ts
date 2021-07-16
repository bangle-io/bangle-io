import type { Command } from 'prosemirror-commands';

export function trimWhiteSpaceBeforeCursor(): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) {
      return false;
    }
    const nodeBefore = state.selection.$from.nodeBefore;
    const textBefore = nodeBefore?.text;
    if (textBefore && nodeBefore?.type.name === 'text') {
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
