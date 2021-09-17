import { Command } from '@bangle.dev/pm';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette';
import React, { useEffect, useMemo, useState } from 'react';
import { UniversalPalette, InlinePaletteRow } from 'ui-components';
import ReactDOM from 'react-dom';
import { useWorkspaceContext } from 'workspace-context';
import { palettePluginKey, tagNodeName } from './config';
import { listAllTags } from './search';

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

export function TagPickerInlinePalette({ wsPath }) {
  const { query, counter, tooltipContentDOM, isVisible } =
    useInlinePaletteQuery(palettePluginKey);
  const existingTags = useListAllTags(isVisible);
  const items = useMemo(() => {
    if (query.length > 0) {
      const newTag = {
        description: '',
        uid: 'create-tag',
        title: 'Create a tag "' + query + '"',
        editorExecuteCommand: ({ item }) => {
          return createTagNode(query);
        },
      };

      // TODO improve upon the items
      const result = existingTags
        .slice(0, 200)
        .sort((a, b) => {
          if (a === query) {
            return -1;
          }
          if (b === query) {
            return 1;
          }
          return levenshteinDistance(a, query) - levenshteinDistance(b, query);
        })
        .slice(0, 15)
        .map((z) => {
          return {
            description: z,
            uid: 'existing-tag-' + z,
            title: z,
            editorExecuteCommand: ({ item }) => {
              return createTagNode(z);
            },
          };
        });

      if (!existingTags.includes(query)) {
        return [newTag, ...result];
      }
      return result;
    }
    return [];
  }, [query, existingTags]);

  const { getItemProps } = useInlinePaletteItems(
    palettePluginKey,
    items,
    counter,
    undefined,
  );

  return ReactDOM.createPortal(
    <div className="inline-palette-wrapper shadow-2xl">
      <div className="inline-palette-items-wrapper tag-picker-inline-palette">
        {items.map((r, i) => {
          return (
            <InlinePaletteRow
              dataId="blah"
              key={r.uid}
              {...getItemProps(r, i)}
              className="palette-row tag-picker-inline-palette-item"
              title={r.title}
            />
          );
        })}
      </div>
      {query ? (
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
      ) : (
        <UniversalPalette.PaletteInfoItem>
          Type a tag
        </UniversalPalette.PaletteInfoItem>
      )}
    </div>,
    tooltipContentDOM,
  );
}

function useListAllTags(isVisible) {
  const { noteWsPaths = [], getNote } = useWorkspaceContext();
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    if (isVisible) {
      listAllTags(noteWsPaths, getNote, controller.signal)
        .then((tags) => {
          setAllTags(tags);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          throw error;
        });
    }
    return () => {
      controller.abort();
    };
  }, [getNote, noteWsPaths, isVisible]);
  return allTags;
}

// TODO this is just copy pasted from stackoverflow
// we will need to rethink
function levenshteinDistance(a, b) {
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  let matrix: any = [];

  // increment along the first column of each row
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  let j: number = 0;
  for (j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1,
          ),
        ); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}
