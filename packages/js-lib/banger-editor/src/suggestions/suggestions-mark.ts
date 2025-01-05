import type { Mark, MarkSpec, Schema } from '../pm';
import { getMarkType } from '../pm-utils';

type SuggestionsMarkAttrs = {
  trigger: string;
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
