import { type EditorState, Fragment, InputRule } from '../pm';

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
      // `start`/`end` from the input-rules plugin cover only the part of
      // `match[0]` that already exists in the document; the rest of the
      // match is the pending text being inserted. Replace the whole range
      // with (boundary + marked trigger) so the positions can never invert —
      // slicing the trigger's offset out of `start` breaks when the boundary
      // character arrives inside a single inserted chunk (" /" via
      // dictation, autocorrect, or insertText), which used to produce an
      // inverted replace range and corrupt structured nodes like tables.
      const boundary = fullMatch.slice(0, fullMatch.length - trigger.length);
      const schema = editorState.schema;
      const mark = schema.mark(markName, { trigger });
      const marks = editorState.selection.$from.marks();
      const content = boundary
        ? Fragment.fromArray([
            schema.text(boundary, marks),
            schema.text(trigger, [mark, ...marks]),
          ])
        : Fragment.from(schema.text(trigger, [mark, ...marks]));
      return editorState.tr
        .replaceWith(start, end, content)
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
