import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';

import type { Command, EditorState, EditorView } from '@bangle.dev/pm';

import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from '@bangle.io/inline-palette';
import { InlinePaletteRow, UniversalPalette } from '@bangle.io/ui-components';
import { assertNotUndefined } from '@bangle.io/utils';

import { palettePluginKey, tagNodeName } from './config';
import { useSearchAllTags } from './search';

export const createTagNode = (tagValue: string): Command => {
  tagValue = tagValue.trim();

  return (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    const nodeType = state.schema.nodes[tagNodeName];

    if (tagValue === '') {
      return false;
    }

    assertNotUndefined(nodeType, 'tag nodeType must be defined');

    return replaceSuggestionMarkWith(
      palettePluginKey,
      nodeType.create({
        tagValue: tagValue,
      }),
    )(state, dispatch, view);
  };
};

export function TagPickerInlinePalette() {
  const { query, counter, tooltipContentDOM, isVisible } =
    useInlinePaletteQuery(palettePluginKey);
  const filteredTags = useSearchAllTags(query, isVisible);
  const items = useMemo(() => {
    if (query.length > 0) {
      const newTag = {
        description: '',
        uid: 'create-tag',
        title: 'Create a tag "' + query + '"',
        editorExecuteCommand: () => {
          return createTagNode(query);
        },
      };

      // TODO improve upon the items
      const result = filteredTags.map((z) => {
        return {
          description: z,
          uid: 'existing-tag-' + z,
          title: z,
          editorExecuteCommand: () => {
            return createTagNode(z);
          },
        };
      });

      if (!filteredTags.includes(query)) {
        return [newTag, ...result];
      }

      return result;
    }

    return [];
  }, [query, filteredTags]);

  const { getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    undefined,
  );

  return ReactDOM.createPortal(
    <div className="shadow-2xl B-ui-components_inline-palette-wrapper flex flex-col bg-colorNeutralBgLayerFloat">
      <div className="B-ui-components_inline-palette-items-wrapper tag-picker-inline-palette">
        {query ? (
          items.map((r, i) => {
            return (
              <InlinePaletteRow
                dataId="blah"
                key={r.uid}
                {...getItemProps(r, i)}
                className="palette-row tag-picker-inline-palette-item"
                title={r.title}
              />
            );
          })
        ) : (
          <InlinePaletteRow
            dataId="searchNote"
            className="palette-row"
            title={'💡 Search for a tag'}
          />
        )}
      </div>
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Add a tag
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Esc</kbd> Dismiss
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </div>,
    tooltipContentDOM,
  );
}
