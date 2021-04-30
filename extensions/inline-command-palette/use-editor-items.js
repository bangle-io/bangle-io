import { useEffect, useMemo, useState } from 'react';
import {
  insertEmptyParagraphAbove,
  insertEmptyParagraphBelow,
  convertToParagraph,
} from '@bangle.dev/core/components/paragraph';
import {
  toggleBulletList,
  toggleTodoList,
} from '@bangle.dev/core/components/bullet-list';
import { toggleOrderedList } from '@bangle.dev/core/components/ordered-list';
import { rafCommandExec } from '@bangle.dev/core/utils/js-utils';
import { replaceSuggestionMarkWith } from 'inline-palette';
import { setBlockType } from '@bangle.dev/core/prosemirror/commands';

import { palettePluginKey } from './config';

export function useEditorItems(query) {
  const baseItem = [
    {
      uid: 'paraBelow',
      title: 'Insert paragraph below ⤵️',
      description: 'Inserts a new paragraph above this block',
      editorExecuteCommand: ({}) => {
        return (state, dispatch, view) => {
          rafCommandExec(view, insertEmptyParagraphBelow());
          return replaceSuggestionMarkWith(palettePluginKey, '')(
            state,
            dispatch,
            view,
          );
        };
      },
    },

    {
      uid: 'paraAbove',
      title: 'Insert paragraph above ⤴️',
      description: 'Inserts a new paragraph below this block',
      editorExecuteCommand: ({}) => {
        return (state, dispatch, view) => {
          rafCommandExec(view, insertEmptyParagraphAbove());
          return replaceSuggestionMarkWith(palettePluginKey, '')(
            state,
            dispatch,
            view,
          );
        };
      },
    },

    {
      uid: 'paraConvert',
      title: 'Convert to Paragraph',
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
    },

    {
      uid: 'bulletListConvert',
      title: 'Convert to Bullet List',
      group: 'list',
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
    },

    {
      uid: 'todoListConvert',
      title: 'Convert to Todo List',
      group: 'list',
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
    },

    {
      uid: 'orderedListConvert',
      group: 'list',
      title: 'Convert to Ordered List',
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
    },

    ...Array.from({ length: 3 }, (_, i) => {
      const level = i + 1;
      return {
        uid: 'headingConvert' + level,
        title: 'Convert to H' + level,
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
      };
    }),
  ];

  return baseItem;
}
