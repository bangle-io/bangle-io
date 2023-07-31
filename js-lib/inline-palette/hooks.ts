import { useCallback, useEffect } from 'react';

import type {
  Command,
  EditorState,
  EditorView,
  PluginKey,
} from '@bangle.dev/pm';
import { useEditorViewContext, usePluginState } from '@bangle.dev/react';
import { suggestTooltip } from '@bangle.dev/tooltip';

import { getSuggestTooltipKey } from './inline-palette';

export function useInlinePaletteQuery(inlinePaletteKey: PluginKey) {
  const view = useEditorViewContext();
  const {
    triggerText: query,
    counter,
    show: isVisible,
  } = usePluginState(getSuggestTooltipKey(inlinePaletteKey)(view.state), true);
  const { tooltipContentDOM } = usePluginState(inlinePaletteKey);

  return { query, counter, isVisible, tooltipContentDOM };
}
/**
 * Hook which takes a function to get the items to render.
 * returns the properties needed to get on click and enter working
 * on these items.
 * TODO this api can be improved currently its unituitive
 * @param {*} param0
 * @returns
 */
export function useInlinePaletteItems<T extends InlinePaletteItem>(
  inlinePaletteKey: PluginKey,
  items: T[],
  counter: number,
  isItemDisabled?: (item: T) => boolean,
): {
  getItemProps: (
    item: T,
    index: number,
  ) => {
    isActive: boolean;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
  dismissPalette: () => boolean;
} {
  const { setExecuteItemCommand } = usePluginState(inlinePaletteKey);
  const view = useEditorViewContext();

  const dismissPalette = useCallback(() => {
    return suggestTooltip.removeSuggestMark(inlinePaletteKey)(
      view.state,
      view.dispatch,
      view,
    );
  }, [view, inlinePaletteKey]);

  const activeIndex = getActiveIndex(counter, items.length);

  const executeHandler = useCallback(
    (itemIndex) => {
      const item = items[itemIndex];

      if (!item) {
        return suggestTooltip.removeSuggestMark(inlinePaletteKey);
      }

      if (isItemDisabled?.(item)) {
        // still handle the key
        return (state: any) => true;
      }

      return (
        state: EditorState,
        dispatch: EditorView['dispatch'] | undefined,
        view: EditorView | undefined,
      ) => {
        return item.editorExecuteCommand({
          item,
          itemIndex,
        })(state, dispatch, view);
      };
    },
    [inlinePaletteKey, items, isItemDisabled],
  );

  useEffect(() => {
    // Save the callback to get the active item so that the plugin
    // can execute an enter on the active item
    setExecuteItemCommand(
      (
        state: EditorState,
        dispatch: EditorView['dispatch'] | undefined,
        view: EditorView | undefined,
      ) => {
        const result = executeHandler(getActiveIndex(counter, items.length))(
          state,
          dispatch,
          view,
        );

        return result;
      },
    );

    return () => {
      setExecuteItemCommand(undefined);
    };
  }, [setExecuteItemCommand, executeHandler, items, counter]);

  const getItemProps = useCallback(
    (item: T, index: number) => {
      return {
        isActive: activeIndex === index,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
          if (executeHandler(index)(view.state, view.dispatch, view)) {
            e.preventDefault();
          }
        },
      };
    },
    [activeIndex, executeHandler, view],
  );

  return {
    getItemProps,
    dismissPalette,
  };
}

function getActiveIndex(counter: number, size: number): number {
  const r = counter % size;

  return r < 0 ? r + size : r;
}

export interface InlinePaletteItem {
  editorExecuteCommand: (arg: {
    item: InlinePaletteItem;
    itemIndex: number;
  }) => Command;
}
