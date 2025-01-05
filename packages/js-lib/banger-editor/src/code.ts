import {
  type Command,
  type EditorState,
  type MarkSpec,
  type MarkType,
  type Node,
  type Schema,
  Selection,
  type TextSelection,
  toggleMark,
} from './pm';

import { type CollectionType, collection, keybinding } from './common';
import { inputRules } from './pm';
import {
  getMarkType,
  isMarkActiveInSelection,
  isTextSelection,
  markInputRule,
  markPastePlugin,
} from './pm-utils';

export type CodeConfig = {
  name?: string;
  markdownShortcut?: boolean;
  escapeAtEdge?: boolean;
  // keys
  keyToggle?: string | false;
};

type RequiredConfig = Required<CodeConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'code',
  markdownShortcut: true,
  escapeAtEdge: true,
  keyToggle: false,
};

export function setupCode(userConfig?: CodeConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const marks = {
    [name]: {
      excludes: '_', // means all marks are excluded
      parseDOM: [{ tag: name }],
      toDOM: () => [name, 0],
    } satisfies MarkSpec,
  };

  const plugin = {
    inputRules: pluginInputRules(config),
    pasteRules: pluginPasteRules(config),
    keybindings: pluginKeybindings(config),
  };

  return collection({
    id: 'code',
    marks,
    plugin,
    command: {
      toggleCode: toggleCode(config),
    },
    query: {
      isCodeActive: isCodeActive(config),
    },
    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const { name, markdownShortcut } = config;
    const type = getMarkType(schema, name);

    if (markdownShortcut) {
      return inputRules({
        rules: [markInputRule(/(?:`)([^`]+)(?:`)$/, type)],
      });
    }

    return null;
  };
}

function pluginPasteRules(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const { name, markdownShortcut } = config;
    const type = getMarkType(schema, name);

    return markdownShortcut
      ? markPastePlugin(/(?:`)([^`]+)(?:`)/g, type)
      : null;
  };
}

function pluginKeybindings(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const { name, escapeAtEdge } = config;
    const type = getMarkType(schema, name);

    return keybinding(
      [
        [config.keyToggle, toggleMark(type)],
        [escapeAtEdge ? 'ArrowRight' : false, moveRight(config)],
        [escapeAtEdge ? 'ArrowLeft' : false, moveLeft(config)],
      ],
      'code',
    );
  };
}

const posHasCode = (state: EditorState, pos: number, code: MarkType) => {
  // This logic exists because
  // in  rtl (right to left) $<code>text#</code>  (where $ and # represent possible cursor positions)
  // at the edges of code only $ and # are valid positions by default.
  // Put other ways, typing at $ cursor pos will not produce regular text,
  // and typing in # will produce code mark text.
  // To know if a pos will be inside code or not we check for a range.
  //    0      1   2   3   4   5   6        7
  // <para/>     a   b   c   d   e    </para>
  // if the mark is [bcd], and we are moving left from 6
  // we will need to check for rangeHasMark(4,5) to get that 5
  // is having a code mark, hence we do a `pos-1`
  // but if we are moving right and from 2, we donot need to add or subtract
  // because just doing rangeHasMark(2, 3) will give us correct answer.

  if (pos < 0 || pos > state.doc.content.size) {
    return false;
  }

  const node = state.doc.nodeAt(pos);
  return node ? node.marks.some((mark) => mark.type === code) : false;
};

function moveRight(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    // The $cursor is a safe way to check if it is a textSelection,
    // It is also used in a bunch of placed in pm-commands when dealing with marks
    // Ref: https://discuss.prosemirror.net/t/what-is-an-example-of-an-empty-selection-that-has-a-cursor/3071
    if (
      !(state.selection.empty && (state.selection as TextSelection).$cursor)
    ) {
      return false;
    }

    const code = getMarkType(state.schema, name);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const $cursor = (state.selection as TextSelection).$cursor!;

    const storedMarks = state.tr.storedMarks;

    const insideCode = markActive(state, code);
    const currentPosHasCode = state.doc.rangeHasMark(
      $cursor.pos,
      $cursor.pos,
      code,
    );
    const nextPosHasCode = state.doc.rangeHasMark(
      $cursor.pos,
      $cursor.pos + 1,
      code,
    );

    const enteringCode =
      !currentPosHasCode &&
      nextPosHasCode &&
      !(storedMarks && storedMarks.length > 0);

    // entering code mark (from the left edge): don't move the cursor, just add the mark
    if (!insideCode && enteringCode) {
      if (dispatch) {
        dispatch(state.tr.addStoredMark(code.create()));
      }
      return true;
    }

    const exitingCode =
      !currentPosHasCode &&
      !nextPosHasCode &&
      !(storedMarks && storedMarks.length === 0);
    // exiting code mark: don't move the cursor, just remove the mark
    if (insideCode && exitingCode) {
      if (dispatch) {
        dispatch(state.tr.removeStoredMark(code));
      }
      return true;
    }

    return false;
  };
}

function moveLeft(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    // The $cursor is a safe way to check if it is a textSelection,
    // It is also used in a bunch of placed in pm-commands when dealing with marks
    // Ref: https://discuss.prosemirror.net/t/what-is-an-example-of-an-empty-selection-that-has-a-cursor/3071
    if (!state.selection.empty) {
      return false;
    }

    if (!isTextSelection(state.selection) || !state.selection.$cursor) {
      return false;
    }
    const $cursor = state.selection.$cursor;

    const code = getMarkType(state.schema, name);
    const insideCode = markActive(state, code);
    const { storedMarks } = state.tr;
    const currentPosHasCode = posHasCode(state, $cursor.pos, code);
    const nextPosHasCode = posHasCode(state, $cursor.pos - 1, code);
    const nextNextPosHasCode = posHasCode(state, $cursor.pos - 2, code);

    const exitingCode =
      currentPosHasCode && !nextPosHasCode && Array.isArray(storedMarks);
    const atLeftEdge =
      nextPosHasCode &&
      !nextNextPosHasCode &&
      (storedMarks === null ||
        (Array.isArray(storedMarks) && !!storedMarks.length));
    const atRightEdge =
      ((exitingCode && Array.isArray(storedMarks) && !storedMarks.length) ||
        (!exitingCode && storedMarks === null)) &&
      !nextPosHasCode &&
      nextNextPosHasCode;
    const enteringCode =
      !currentPosHasCode &&
      nextPosHasCode &&
      Array.isArray(storedMarks) &&
      !storedMarks.length;

    // at the right edge: remove code mark and move the cursor to the left
    if (!insideCode && atRightEdge) {
      const tr = state.tr.setSelection(
        Selection.near(state.doc.resolve($cursor.pos - 1)),
      );

      if (dispatch) {
        dispatch(tr.removeStoredMark(code));
      }
      return true;
    }

    // entering code mark (from right edge): don't move the cursor, just add the mark
    if (!insideCode && enteringCode) {
      if (dispatch) {
        dispatch(state.tr.addStoredMark(code.create()));
      }
      return true;
    }

    // at the left edge: add code mark and move the cursor to the left
    if (insideCode && atLeftEdge) {
      const tr = state.tr.setSelection(
        Selection.near(state.doc.resolve($cursor.pos - 1)),
      );

      if (dispatch) {
        dispatch(tr.addStoredMark(code.create()));
      }
      return true;
    }

    // exiting code mark (or at the beginning of the line): don't move the cursor, just remove the mark
    const isFirstChild = $cursor.index($cursor.depth - 1) === 0;
    if (insideCode && (exitingCode || (!$cursor.nodeBefore && isFirstChild))) {
      dispatch?.(state.tr.removeStoredMark(code));
      return true;
    }

    return false;
  };
}
// COMMANDS
function toggleCode(config: RequiredConfig): Command {
  const { name } = config;
  return (state, dispatch) => {
    const markType = getMarkType(state.schema, name);
    return toggleMark(markType)(state, dispatch);
  };
}

// QUERY
function isCodeActive(config: RequiredConfig) {
  return (state: EditorState) => {
    const { name } = config;
    const markType = getMarkType(state.schema, name);
    return isMarkActiveInSelection(markType, state);
  };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    marks: {
      [name]: {
        toMarkdown: {
          open(_state, _mark, parent, index) {
            return backticksFor(parent.child(index), -1);
          },
          close(_state, _mark, parent, index) {
            return backticksFor(parent.child(index - 1), 1);
          },
          escape: false,
        },
        parseMarkdown: {
          code_inline: { mark: name, noCloseToken: true },
        },
      },
    },
  };
}

function backticksFor(node: Node, side: number) {
  const ticks = /`+/g;
  let m: RegExpExecArray | null;
  let len = 0;
  if (node.isText) {
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    while ((m = ticks.exec(node.text!))) {
      const res = m[0];
      if (typeof res === 'string') {
        len = Math.max(len, res.length);
      }
    }
  }
  let result = len > 0 && side > 0 ? ' `' : '`';
  for (let i = 0; i < len; i++) {
    result += '`';
  }
  if (len > 0 && side < 0) {
    result += ' ';
  }
  return result;
}

function markActive(state: EditorState, mark: MarkType) {
  const { from, to, empty } = state.selection;
  // When the selection is empty, only the active marks apply.
  if (empty) {
    return !!mark.isInSet(
      state.tr.storedMarks || state.selection.$from.marks(),
    );
  }
  // For a non-collapsed selection, the marks on the nodes matter.
  let found = false;
  state.doc.nodesBetween(from, to, (node) => {
    found = found || !!mark.isInSet(node.marks);
  });
  return found;
}
