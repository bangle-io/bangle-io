import { assertIsDefined } from '@bangle.io/mini-js-utils';
import type { Mark, Schema } from '@prosekit/pm/model';
import type { MarkSpecOptions } from 'prosekit/core';

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
}): MarkSpecOptions<TMarkName, SuggestionsMarkAttrs> {
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
  const mark = schema.marks?.[markName]?.create(attrs);
  assertIsDefined(mark, 'mark');

  return mark as Mark & { attrs: SuggestionsMarkAttrs };
}
