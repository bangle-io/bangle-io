import { useCallback, useEffect } from 'react';
import { suggestTooltip } from '@bangle.dev/tooltip';
import { useEditorViewContext, usePluginState } from '@bangle.dev/react';
import { getSuggestTooltipKey } from './inline-palette';

export function useInlinePaletteQuery(inlinePaletteKey) {
  // TODO show is a bad name
  const {
    triggerText: query,
    counter,
    show: isVisible,
  } = usePluginState(getSuggestTooltipKey(inlinePaletteKey), true);
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
export function useInlinePaletteItems(
  inlinePaletteKey,
  items,
  counter,
  isItemDisabled,
) {
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

      if (isItemDisabled(item)) {
        // still handle the key
        return (state) => true;
      }

      return (state, dispatch, view) => {
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
    setExecuteItemCommand((state, dispatch, view) => {
      const result = executeHandler(getActiveIndex(counter, items.length))(
        state,
        dispatch,
        view,
      );
      return result;
    });
    return () => {
      setExecuteItemCommand(undefined);
    };
  }, [setExecuteItemCommand, executeHandler, items, counter]);

  const getItemProps = useCallback(
    (item, index) => {
      return {
        isActive: activeIndex === index,
        onClick: (e) => {
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

function getActiveIndex(counter, size) {
  const r = counter % size;
  return r < 0 ? r + size : r;
}
