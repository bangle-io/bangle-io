import { useMemo } from 'react';

import {
  bulletList,
  listItem,
  orderedList,
  paragraph,
} from '@bangle.dev/base-components';
import { EditorState, EditorView, setBlockType } from '@bangle.dev/pm';
import { rafCommandExec } from '@bangle.dev/utils';

import { replaceSuggestionMarkWith } from '@bangle.io/inline-palette';

import {
  chainedInsertParagraphAbove,
  chainedInsertParagraphBelow,
  isList,
} from './commands';
import { palettePluginKey } from './config';
import { PaletteItem } from './palette-item';

const { convertToParagraph } = paragraph;
const {
  toggleBulletList,
  toggleTodoList,
  queryIsBulletListActive,
  queryIsTodoListActive,
} = bulletList;
const { insertEmptySiblingListAbove, insertEmptySiblingListBelow } = listItem;
const { toggleOrderedList, queryIsOrderedListActive } = orderedList;

const setHeadingBlockType =
  (level: number) =>
  (state: EditorState, dispatch: EditorView['dispatch'] | undefined) => {
    const type = state.schema.nodes.heading;
    return setBlockType(type, { level })(state, dispatch);
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
        disabled: (state: any) => {
          return isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, chainedInsertParagraphBelow());
            }
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
        disabled: (state: any) => {
          return isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, chainedInsertParagraphAbove());
            }
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
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(
                view,
                (
                  state: EditorState,
                  dispatch: EditorView['dispatch'] | undefined,
                  view: EditorView | undefined,
                ) => {
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
                },
              );
            }

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
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleBulletList());
            }
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
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleTodoList());
            }
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
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleOrderedList());
            }
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'insertSiblingListAbove',
        group: 'editor',
        title: 'Insert List above ⤴️',
        keywords: ['insert', 'above', 'lists'],
        description: 'Insert a list item above the current list item',
        disabled: (state: any) => {
          return !isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, insertEmptySiblingListAbove());
            }
            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'insertSiblingListBelow',
        group: 'editor',
        title: 'Insert List below ⤵️',
        keywords: ['insert', 'below', 'lists'],
        description: 'Insert a list item below the current list item',
        disabled: (state: any) => {
          return !isList()(state);
        },
        editorExecuteCommand: ({}) => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              if (view) {
                rafCommandExec(view, insertEmptySiblingListBelow());
              }
            }
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
          disabled: (state: any) => {
            const result = isList()(state);
            return result;
          },
          editorExecuteCommand: () => {
            return (
              state: EditorState,
              dispatch: EditorView['dispatch'] | undefined,
              view: EditorView | undefined,
            ) => {
              if (view) {
                rafCommandExec(view, setHeadingBlockType(level));
              }
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
