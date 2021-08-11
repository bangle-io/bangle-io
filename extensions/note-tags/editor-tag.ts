import {
  BaseRawNodeSpec,
  domSerializationHelpers,
  NodeView,
  RawSpecs,
} from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';
import { keymap } from '@bangle.dev/pm';
import {
  inlinePalette,
  queryInlinePaletteActive,
  queryInlinePaletteText,
  replaceSuggestionMarkWith,
} from 'inline-palette';
import {
  MARKDOWN_REGEX,
  palettePluginKey,
  tagNodeName,
  BANNED_CHARS,
  paletteMarkName,
} from './config';
import { createTagNode } from './TagPickerInlinePalette';
const getScrollContainer = (view) => {
  return view.dom.parentElement;
};
export function editorTagPlugins() {
  return () => [
    NodeView.createPlugin({
      name: tagNodeName,
      // inline-block allows the span to get full height of image
      // or else folks depending on the boundingBox get incorrect
      // dimensions.
      containerDOM: [
        'span',
        {
          style: 'display: inline-block; color: pink;',
          class: 'inline-backlink',
        },
      ],
    }),
    keymap({
      Space: breakTag('Space'),
      ...Object.fromEntries(
        BANNED_CHARS.split('').map((r) => [r, breakTag(r)]),
      ),
    }),
  ];
}

export function editorTagHighPriorityPlugins() {
  return () => [
    inlinePalette.plugins({
      key: palettePluginKey,
      markName: paletteMarkName,
      tooltipRenderOpts: {
        getScrollContainer,
      },
    }),
  ];
}

function breakTag(key) {
  return (state, dispatch, view) => {
    if (queryInlinePaletteActive(palettePluginKey)(state)) {
      const text = queryInlinePaletteText(palettePluginKey)(state);

      if (key === 'Space') {
        if (text) {
          return createTagNode(text)(state, dispatch, view);
        }
        // This is helpful to avoid messing up the
        // `#` heading markdown shortcut.
        // If there is no text and the person pressed space
        // the intent is to trigger the heading shortcut.
        return false;
      }
      return replaceSuggestionMarkWith(
        palettePluginKey,
        state.schema.text('#' + text + key),
      )(state, dispatch, view);
    }
    return false;
  };
}

const trigger = '#';

export function editorTagSpec(): RawSpecs {
  const { toDOM, parseDOM } = domSerializationHelpers(tagNodeName, {
    tag: 'span',
    parsingPriority: 52,
  });

  const spec: BaseRawNodeSpec = {
    type: 'node',
    name: tagNodeName,
    schema: {
      attrs: {
        tagValue: {
          default: 'tag',
        },
      },
      inline: true,
      group: 'inline',
      selectable: false,
      draggable: true,
      toDOM,
      parseDOM,
    },
    markdown: {
      toMarkdown: (state, node) => {
        const { tagValue } = node.attrs;
        state.text('#' + tagValue, false);
      },
      parseMarkdown: {
        note_tag: {
          block: tagNodeName,
          getAttrs: (tok) => {
            if (typeof tok.payload === 'string') {
              return { tagValue: tok.payload };
            }
            return { tagValue: undefined };
          },
          noCloseToken: true,
        },
      },
    },
  };
  return [inlinePalette.spec({ markName: paletteMarkName, trigger }), spec];
}

export function noteTagsMarkdownItPlugin(md: any) {
  inlineNodeParser(md, {
    tokenName: 'note_tag',
    regex: MARKDOWN_REGEX,
    getTokenDetails: (match) => {
      return { payload: match.slice(1), markup: match.slice(1) };
    },
  });
}
