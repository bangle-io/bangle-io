import {
  BaseRawNodeSpec,
  domSerializationHelpers,
  NodeView,
} from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';
import { MARKDOWN_REGEX, tagNodeName } from './config';

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
    // keymap({
    //   Space: (state, dispatch, view) => {
    //     if (queryInlinePaletteActive(palettePluginKey)(state)) {
    //       const text = queryInlinePaletteText(palettePluginKey)(state);
    //       return createTagNode(text)(state, dispatch, view);
    //     }

    //     return false;
    //   },
    // }),
  ];
}

export function editorTagSpec(): BaseRawNodeSpec {
  const { toDOM, parseDOM } = domSerializationHelpers(tagNodeName, {
    tag: 'span',
    parsingPriority: 52,
  });

  return {
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
          getAttrs: (tok: any) => {
            if (typeof tok.payload === 'string') {
              return { tagValue: tok.payload };
            }
          },
          noCloseToken: true,
        },
      },
    },
  };
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
