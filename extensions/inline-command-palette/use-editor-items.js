import { useEffect, useMemo, useState } from 'react';
import { convertToParagraph } from '@bangle.dev/core/components/paragraph';
import {
  toggleBulletList,
  toggleTodoList,
  queryIsBulletListActive,
  queryIsTodoListActive,
} from '@bangle.dev/core/components/bullet-list';
import { toggleOrderedList } from '@bangle.dev/core/components/ordered-list';
import { rafCommandExec } from '@bangle.dev/core/utils/js-utils';
import { replaceSuggestionMarkWith } from 'inline-palette';
import { setBlockType } from '@bangle.dev/core/prosemirror/commands';
import { queryIsOrderedListActive } from '@bangle.dev/core/components/ordered-list';

import { palettePluginKey } from './config';
import { PaletteItem } from './palette-item';
import {
  chainedInsertParagraphAbove,
  chainedInsertParagraphBelow,
  isList,
} from './commands';

const setHeadingBlockType = (level) => (state, dispatch, view) => {
  const type = state.schema.nodes.heading;
  return setBlockType(type, { level })(state, dispatch, view);
};

export function useEditorItems() {
  const baseItem = useMemo(
    () => [
      PaletteItem.create({
        uid: 'paraBelow',
        title: 'Insert paragraph below ⤵️',
        group: 'editor',
        description: 'Inserts a new paragraph below this block',
        // TODO current just disabling it, but we need to implement this method for lists
        disabled: (state) => {
          return isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, chainedInsertParagraphBelow());
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'paraAbove',
        title: 'Insert paragraph above ⤴️',
        group: 'editor',
        description: 'Inserts a new paragraph above this block',
        disabled: (state) => {
          return isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, chainedInsertParagraphAbove());
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'paraConvert',
        title: 'Paragraph',
        group: 'editor',
        description: 'Convert the current block to paragraph',
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, (state, dispatch, view) => {
              if (queryIsTodoListActive()(state)) {
                return toggleTodoList()(state, dispatch, view);
              }
              if (queryIsBulletListActive()(state)) {
                return toggleBulletList()(state, dispatch, view);
              }
              if (queryIsOrderedListActive()(state)) {
                return toggleOrderedList()(state, dispatch, view);
              }
              return convertToParagraph()(state, dispatch, view);
            });

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'bulletListConvert',
        title: 'Bullet List',
        group: 'editor',
        keywords: ['unordered', 'lists'],
        description: 'Convert the current block to bullet list',
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, toggleBulletList());
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'todoListConvert',
        title: 'Todo List',
        group: 'editor',
        keywords: ['todo', 'lists', 'checkbox', 'checked'],
        description: 'Convert the current block to todo list',
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, toggleTodoList());
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'orderedListConvert',
        group: 'editor',
        title: 'Ordered List',
        keywords: ['numbered', 'lists'],
        description: 'Convert the current block to ordered list',
        editorExecuteCommand: ({}) => {
          return (state, dispatch, view) => {
            rafCommandExec(view, toggleOrderedList());
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      ...Array.from({ length: 3 }, (_, i) => {
        const level = i + 1;
        return PaletteItem.create({
          uid: 'headingConvert' + level,
          title: 'H' + level,
          group: 'editor',
          description: 'Convert the current block to heading level ' + level,
          disabled: (state) =>
            !setHeadingBlockType(level)(state) || isList()(state),
          editorExecuteCommand: () => {
            return (state, dispatch, view) => {
              rafCommandExec(view, setHeadingBlockType(level));
              return replaceSuggestionMarkWith(palettePluginKey, '')(
                state,
                dispatch,
                view,
              );
            };
          },
        });
      }),
    ],
    [],
  );

  return baseItem;
}
