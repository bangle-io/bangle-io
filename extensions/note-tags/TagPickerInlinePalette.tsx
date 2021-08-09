import { Command } from '@bangle.dev/pm';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette';
import React from 'react';
import ReactDOM from 'react-dom';
import { InlinePaletteRow } from 'ui-components';

import { palettePluginKey, tagNodeName } from './config';

export const createTagNode = (tagValue: string): Command => {
  tagValue = tagValue.trim();
  return (state, dispatch, view) => {
    const nodeType = state.schema.nodes[tagNodeName];
    if (tagValue === '') {
      return false;
    }
    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        tagValue: tagValue,
      }),
    )(state, dispatch, view);
  };
};

const items = Array.from({ length: 40 }, (_, j) => ({
  description: 'Wow',
  uid: j + '',
  title: 'I am a tag ' + j,
  editorExecuteCommand: ({ item }) => {
    return createTagNode(item.title);
  },
}));

export function TagPickerInlinePalette({ wsPath }) {
  const { counter, tooltipContentDOM } =
    useInlinePaletteQuery(palettePluginKey);

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
