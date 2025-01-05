import { InputRule } from '../pm';

import { type EditorState, TextSelection } from '../pm';

// ProseMirror uses the Unicode Character 'OBJECT REPLACEMENT CHARACTER' (U+FFFC) as text representation for
// leaf nodes, i.e. nodes that don't have any content or text property (e.g. hardBreak, emoji)
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
      const trigger = match[3] || match[2];
      if (!trigger) {
        return null;
      }
      const schema = editorState.schema;
      const mark = schema.mark(markName, { trigger });
      const { tr, selection } = editorState;
      if (trigger.length > 1) {
        const textSelection = TextSelection.create(
          tr.doc,
          selection.from,
          selection.from - trigger.length + 1,
        );
        tr.setSelection(textSelection);
      }
      const marks = selection.$from.marks();
      return tr.replaceSelectionWith(
        schema.text(trigger, [mark, ...marks]),
        false,
      );
    },
  );

  return startRule;
}

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExpChar = RegExp(reRegExpChar.source);

function escapeRegExp(string: string) {
  return string && reHasRegExpChar.test(string)
    ? string.replace(reRegExpChar, '\\$&')
    : string || '';
}
