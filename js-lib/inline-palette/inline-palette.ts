import type { BaseRawMarkSpec, SpecRegistry } from '@bangle.dev/core';
import { PluginKey } from '@bangle.dev/core';
import type {
  Command,
  EditorState,
  EditorView,
  Fragment,
  Node,
} from '@bangle.dev/pm';
import type { SuggestTooltipRenderOpts } from '@bangle.dev/tooltip';
import { createTooltipDOM, suggestTooltip } from '@bangle.dev/tooltip';
import { bangleWarn, valuePlugin } from '@bangle.dev/utils';

let lastTime = 0;
const safeRequestAnimationFrame =
  typeof window !== 'undefined' && window.requestAnimationFrame
    ? window.requestAnimationFrame
    : function (callback: (r: number) => void) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;

        return id;
      };

const {
  decrementSuggestTooltipCounter,
  incrementSuggestTooltipCounter,
  queryIsSuggestTooltipActive,
} = suggestTooltip;

export const spec = specFactory;
export const plugins = pluginsFactory;
export const commands = {};

function specFactory({
  markName,
  trigger,
}: {
  markName: string;
  trigger: string;
}): BaseRawMarkSpec {
  const spec = suggestTooltip.spec({ markName, trigger });

  return {
    ...spec,
    options: {
      ...spec.options,
      trigger,
    },
  };
}

function pluginsFactory({
  key,
  markName,
  tooltipRenderOpts = {},
}: {
  key: PluginKey;
  markName: string;
  tooltipRenderOpts: SuggestTooltipRenderOpts;
}) {
  return ({
    schema,
    specRegistry,
  }: {
    schema: EditorState['schema'];
    specRegistry: SpecRegistry;
  }) => {
    const { trigger } = specRegistry.options[markName];
    const suggestTooltipKey = new PluginKey('suggestTooltipKey');

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
      return (
        state: EditorState,
        dispatch: EditorView['dispatch'] | undefined,
        view: EditorView | undefined,
      ) => {
        safeRequestAnimationFrame(() => {
          view?.focus();
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

    let executeItemCommand: Command | undefined;

    return [
      valuePlugin(key, {
        // We are setting this callback which returns us the
        // the currently active item (the one that executes when enter is pressed)
        // this is here because this is the only way I could think of passing
        // data from a react component to plugin. Note it will not trigger
        // any update or anything - dont confuse it will setState in react.
        // its a simple swap of a closure variable which the enter handler
        // can then use if pressed.
        setExecuteItemCommand: (command: Command) => {
          executeItemCommand = command;
        },
        tooltipContentDOM: tooltipDOMSpec.contentDOM,
        markName,
        suggestTooltipKey,
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
        onEnter: (
          state: EditorState,
          dispatch: EditorView['dispatch'] | undefined,
          view: EditorView | undefined,
        ) => {
          return executeItemCommand
            ? executeItemCommand(state, dispatch, view)
            : false;
        },
        onArrowDown: updateCounter('DOWN'),
        onArrowUp: updateCounter('UP'),
      }),
    ];
  };
}

export function getSuggestTooltipKey(key: PluginKey) {
  return (state: EditorState) => {
    return key.getState(state).suggestTooltipKey as PluginKey;
  };
}

export function replaceSuggestionMarkWith(
  key: PluginKey,
  replaceWith?: string | Node | Fragment,
): Command {
  return (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    const suggestTooltipKey = getSuggestTooltipKey(key)(state);

    return suggestTooltip.replaceSuggestMarkWith(
      suggestTooltipKey,
      replaceWith,
    )(state, dispatch, view);
  };
}

export function queryInlinePaletteActive(key: PluginKey) {
  return (state: EditorState) => {
    const suggestTooltipKey = getSuggestTooltipKey(key)(state);

    return queryIsSuggestTooltipActive(suggestTooltipKey)(state);
  };
}

export function queryInlinePaletteText(key: PluginKey) {
  return (state: EditorState) => {
    const suggestTooltipKey = getSuggestTooltipKey(key)(state);

    return suggestTooltip.queryTriggerText(suggestTooltipKey)(state);
  };
}
