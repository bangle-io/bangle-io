import { bangleWarn } from '@bangle.dev/core/utils/js-utils';
import { suggestTooltip, createTooltipDOM } from '@bangle.dev/tooltip/index';
import {
  decrementSuggestTooltipCounter,
  incrementSuggestTooltipCounter,
} from '@bangle.dev/tooltip/suggest-tooltip';
import { valuePlugin } from '@bangle.dev/core/utils/pm-utils';
import { pluginKeyStore } from '@bangle.dev/core/utils/plugin-key-store';

export const spec = specFactory;
export const plugins = pluginsFactory;
export const commands = {};

function specFactory({ markName, trigger } = {}) {
  const spec = suggestTooltip.spec({ markName, trigger });

  return {
    ...spec,
    options: {
      ...spec.options,
      trigger,
    },
  };
}

const keyStore = pluginKeyStore();

function pluginsFactory({ key, markName, tooltipRenderOpts = {} } = {}) {
  return ({ schema, specRegistry }) => {
    const { trigger } = specRegistry.options[markName];
    const suggestTooltipKey = keyStore.create(key, 'suggestTooltipKey');

    // We are converting to DOM elements so that their instances
    // can be shared across plugins.
    const tooltipDOMSpec = createTooltipDOM(tooltipRenderOpts.tooltipDOMSpec);

    const getIsTop = () =>
      tooltipDOMSpec.dom.getAttribute('data-popper-placement') === 'top-start';

    if (!schema.marks[markName]) {
      bangleWarn(
        `Couldn't find the markName:${markName}, please make sure you have initialized to use the same markName you initialized the spec with`,
      );
      throw new Error(`markName ${markName} not found`);
    }

    const updateCounter = (key = 'UP') => {
      return (state, dispatch, view) => {
        requestAnimationFrame(() => {
          view.focus();
        });
        if (key === 'UP' ? !getIsTop() : getIsTop()) {
          return decrementSuggestTooltipCounter(suggestTooltipKey)(
            state,
            dispatch,
            view,
          );
        } else {
          return incrementSuggestTooltipCounter(suggestTooltipKey)(
            state,
            dispatch,
            view,
          );
        }
      };
    };

    let executeItemCommand;
    return [
      valuePlugin(key, {
        // We are setting this callback which returns us the
        // the currently active item (the one that executes when enter is pressed)
        // this is here because this is the only way I could think of passing
        // data from a react component to plugin. Note it will not trigger
        // any update or anything - dont confuse it will setState in react.
        // its a simple swap of a closure variable which the enter handler
        // can then use if pressed.
        setExecuteItemCommand: (command) => {
          executeItemCommand = command;
        },
        tooltipContentDOM: tooltipDOMSpec.contentDOM,
        markName,
      }),
      suggestTooltip.plugins({
        key: suggestTooltipKey,
        markName,
        trigger,
        tooltipRenderOpts: {
          placement: 'bottom',
          ...tooltipRenderOpts,
          tooltipDOMSpec,
        },
        onEnter: (state, dispatch, view) => {
          return executeItemCommand?.(state, dispatch, view);
        },
        onArrowDown: updateCounter('DOWN'),
        onArrowUp: updateCounter('UP'),
      }),
    ];
  };
}

export function getSuggestTooltipKey(key) {
  return keyStore.get(key, 'suggestTooltipKey');
}

export function replaceSuggestionMarkWith(key, replaceWith) {
  return (state, dispatch, view) => {
    const suggestTooltipKey = getSuggestTooltipKey(key);
    return suggestTooltip.replaceSuggestMarkWith(
      suggestTooltipKey,
      replaceWith,
    )(state, dispatch, view);
  };
}
