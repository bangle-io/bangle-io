import { type EditorState, InputRule } from '../pm';

// ProseMirror uses the Unicode Character 'OBJECT REPLACEMENT CHARACTER' (U+FFFC) as text representation for
// leaf nodes, i.e. nodes that don't have any content or text property (e.g. hardBreak, emoji)
const leafNodeReplacementCharacter = '\ufffc';

export function triggerInputRule({
  trigger,
  markName,
  requireTriggerBoundary = true,
}: {
  trigger: string;
  markName: string;
  requireTriggerBoundary?: boolean;
}) {
  const regexStart = new RegExp(
    requireTriggerBoundary
      ? `(^|[.!?\\s${leafNodeReplacementCharacter}])(${escapeRegExp(trigger)})$`
      : `(${escapeRegExp(trigger)})$`,
  );

  const startRule = new InputRule(
    regexStart,
    (editorState: EditorState, match: string[], start: number, end: number) => {
      const linkMarkType = editorState.schema.marks.link;
      if (
        editorState.selection.$from.parent.type.spec.code ||
        editorState.selection.$from
          .marks()
          .some((mark) => mark.type.spec.code || mark.type === linkMarkType)
      ) {
        return null;
      }
      const fullMatch = match[0];
      const trigger = match[2] || match[1];
      if (!fullMatch || !trigger) {
        return null;
      }
      // `start`/`end` come from the input-rules plugin and are correct
      // whether the trigger arrived one keystroke at a time or as a single
      // inserted chunk (dictation, autocorrect). `match[0]` may include a
      // boundary character before the trigger — keep it in the document.
      const triggerStart = start + (fullMatch.length - trigger.length);
      const schema = editorState.schema;
      const mark = schema.mark(markName, { trigger });
      const marks = editorState.selection.$from.marks();
      return editorState.tr
        .replaceWith(triggerStart, end, schema.text(trigger, [mark, ...marks]))
        .addStoredMark(mark);
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
