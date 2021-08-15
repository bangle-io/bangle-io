import { Command } from '@bangle.dev/pm';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { InlinePaletteRow } from 'ui-components';
import { BANNED_CHARS, palettePluginKey, tagNodeName } from './config';

export const createTagNode = (tagValue: string): Command => {
  tagValue = tagValue.trim();
  return (state, dispatch, view) => {
    const nodeType = state.schema.nodes[tagNodeName];
    if (tagValue === '') {
      return false;
    }

    if (BANNED_CHARS.split('').some((r) => tagValue.includes(r))) {
      return replaceSuggestionMarkWith(
        palettePluginKey,
        state.schema.text(tagValue),
      )(state, dispatch, view);
    }

    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        tagValue: tagValue,
      }),
    )(state, dispatch, view);
  };
};

export function TagPickerInlinePalette({ wsPath }) {
  const { query, counter, tooltipContentDOM } =
    useInlinePaletteQuery(palettePluginKey);

  const items = useMemo(() => {
    if (query.length > 0) {
      return [
        {
          description: '',
          uid: 'create-tag',
          title: 'Create a tag "' + query + '"',
          editorExecuteCommand: ({ item }) => {
            return createTagNode(query);
          },
        },
      ];
    }
    return [];
  }, [query]);

  const { getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    undefined,
  );

  return ReactDOM.createPortal(
    <div className="inline-palette-wrapper shadow-2xl">
      <div className="inline-palette-items-wrapper">
        {items.map((r, i) => {
          return (
            <InlinePaletteRow
              dataId="blah"
              key={r.uid}
              {...getItemProps(r, i)}
              className="palette-row"
              title={'💡 ' + r.title}
            />
          );
        })}
      </div>
    </div>,
    tooltipContentDOM,
  );
}
