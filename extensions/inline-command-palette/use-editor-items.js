import { useEffect, useMemo, useState } from 'react';
import { convertToParagraph } from '@bangle.dev/core/components/paragraph';
import {
  toggleBulletList,
  toggleTodoList,
} from '@bangle.dev/core/components/bullet-list';
import { toggleOrderedList } from '@bangle.dev/core/components/ordered-list';
import { rafCommandExec } from '@bangle.dev/core/utils/js-utils';
import { replaceSuggestionMarkWith } from 'inline-palette';
import { setBlockType } from '@bangle.dev/core/prosemirror/commands';

import { palettePluginKey } from './config';
import { PaletteItem } from './palette-item';
import {
  chainedInsertParagraphAbove,
  chainedInsertParagraphBelow,
} from './commands';

export function useEditorItems(query) {
  const baseItem = [
    PaletteItem.create({
      uid: 'paraBelow',
      title: 'Insert paragraph below ⤵️',
      group: 'editor',
      description: 'Inserts a new paragraph below this block',
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
          rafCommandExec(view, convertToParagraph());
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
        editorExecuteCommand: () => {
          return (state, dispatch, view) => {
            rafCommandExec(view, (state, dispatch, view) => {
              const type = state.schema.nodes.heading;
              return setBlockType(type, { level })(state, dispatch, view);
            });
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      });
    }),
  ];

  return baseItem;
}
