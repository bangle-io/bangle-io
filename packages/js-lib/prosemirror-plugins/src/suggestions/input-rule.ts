import { InputRule } from '@prosekit/pm/inputrules';

import { type EditorState, TextSelection } from '@prosekit/pm/state';

// ProseMirror uses the Unicode Character 'OBJECT REPLACEMENT CHARACTER' (U+FFFC) as text representation for
// leaf nodes, i.e. nodes that don't have any content or text property (e.g. hardBreak, emoji)
// It was introduced because of https://github.com/ProseMirror/prosemirror/issues/262
// This can be used in an input rule regex to be able to include or exclude such nodes.
const leafNodeReplacementCharacter = '\ufffc';

export function triggerInputRule({
  trigger,
  markName,
}: {
  trigger: string;
  markName: string;
}) {
  const regexStart = new RegExp(
    `(^|[.!?\\s${leafNodeReplacementCharacter}])(${escapeRegExp(trigger)})$`,
  );

  const startRule = new InputRule(
    regexStart,
    (editorState: EditorState, match: string[]) => {
      /**
       * Why using match 2 and 3?  Regex:
       * (allowed characters before trigger)(joined|triggers|(sub capture groups))
       *            match[1]                     match[2]          match[3] – optional
       */
      const trigger = match[3] || match[2];
      if (!trigger) {
        return null;
      }
      const schema = editorState.schema;
      const mark = schema.mark(markName, { trigger });
      const { tr, selection } = editorState;
      // set the selection to cover the trigger
      // when the trigger is bigger than 1 char.
      // for 1 char length you dont need a non empty selection.
      if (trigger.length > 1) {
        const textSelection = TextSelection.create(
          tr.doc,
          selection.from,
          selection.from - trigger.length + 1,
        );
        tr.setSelection(textSelection);
      }
      const marks = selection.$from.marks(); // selection would tell the cursor position, in this case from == to as no selection
      return tr.replaceSelectionWith(
        schema.text(trigger, [mark, ...marks]),
        false,
      );
    },
  );

  return startRule;
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExpChar = RegExp(reRegExpChar.source);

/**
 * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
 * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
 *
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @see escape, escapeRegExp, unescape
 * @example
 *
 * escapeRegExp('[lodash](https://lodash.com/)')
 * // => '\[lodash\]\(https://lodash\.com/\)'
 */
function escapeRegExp(string: string) {
  return string && reHasRegExpChar.test(string)
    ? string.replace(reRegExpChar, '\\$&')
    : string || '';
}
