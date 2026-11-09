import type { Mark, MarkSpec, Schema } from '../pm';
import { getMarkType } from '../pm-utils';

type SuggestionsMarkAttrs = {
  trigger: string;
  /**
   * True when the suggestion was opened programmatically (e.g. the "+"
   * block button) rather than by typing the trigger. Escape removes the
   * whole synthetic trigger text; a typed trigger stays in the document.
   */
  synthetic?: boolean;
};

export function suggestionsMark<TMarkName extends string>({
  markName,
  className,
  trigger,
}: {
  markName: TMarkName;
  className: string;
  trigger: string;
}): MarkSpec {
  return {
    name: markName,
    inclusive: true,
    excludes: '_',
    group: 'suggestTriggerMarks',
    parseDOM: [{ tag: `span[data-mark-name="${markName}"]` }],
    toDOM: () => {
      return [
        'span',
        {
          'data-mark-name': markName,
          'data-suggest-trigger': trigger,
          class: className,
        },
      ];
    },
    attrs: {
      trigger: { default: trigger },
      synthetic: { default: false },
    },
  };
}

export function createSuggestionsMark(
  schema: Schema,
  markName: string,
  attrs?: SuggestionsMarkAttrs,
): Mark & { attrs: SuggestionsMarkAttrs } {
  const mark = getMarkType(schema, markName).create(attrs);

  return mark as Mark & { attrs: SuggestionsMarkAttrs };
}
