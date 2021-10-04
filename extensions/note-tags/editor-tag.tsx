import {
  BaseRawNodeSpec,
  domSerializationHelpers,
  NodeView,
  RawSpecs,
} from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';
import { keymap } from '@bangle.dev/pm';
import { useActionContext } from 'action-context';
import {
  inlinePalette,
  queryInlinePaletteActive,
  queryInlinePaletteText,
  replaceSuggestionMarkWith,
} from 'inline-palette';
import {
  MARKDOWN_REGEX,
  USING_INFERIOR_REGEX,
  palettePluginKey,
  tagNodeName,
  BANNED_CHARS,
  paletteMarkName,
  TRIGGER,
} from './config';
import React, { useCallback } from 'react';
import { RenderReactNodeView } from 'extension-registry';
const MAX_MATCH = 500;
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
          class: 'note-tag-container',
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
      const { $from } = state.selection;
      let textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - MAX_MATCH),
        $from.parentOffset,
        null,
        '\ufffc',
      );

      if (key === 'Space') {
        // This is helpful to avoid messing up the
        // `#` heading markdown shortcut.
        // If there is no text and the person pressed space
        // the intent is to trigger the heading shortcut.
        if (textBefore === '#') {
          return false;
        }
        if (text === '') {
          return replaceSuggestionMarkWith(
            palettePluginKey,
            state.schema.text('# '),
          )(state, dispatch, view);
        }
        const nodeType = state.schema.nodes[tagNodeName];
        return replaceSuggestionMarkWith(
          palettePluginKey,
          nodeType.create({
            tagValue: text,
          }),
        )(state, dispatch, view);

        // return false;
      }
      return replaceSuggestionMarkWith(
        palettePluginKey,
        state.schema.text('#' + text + key),
      )(state, dispatch, view);
    }
    return false;
  };
}

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
        // check if there is no white space
        if (!state.out.endsWith(' ') && state.out !== '') {
          // prefix with whitespace so that tags
          // don't get fused to the previous node
          state.out += ' ';
        }

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
  return [
    inlinePalette.spec({ markName: paletteMarkName, trigger: TRIGGER }),
    spec,
  ];
}

export function noteTagsMarkdownItPlugin(md: any) {
  inlineNodeParser(md, {
    tokenName: 'note_tag',
    regex: MARKDOWN_REGEX,
    getTokenDetails: (match) => {
      if (USING_INFERIOR_REGEX) {
        // see the explanation in the source file of regex
        // due to the inferior regex for safari we get an extra whitespace
        // in the match
        match = match.trim();
      }
      return { payload: match.slice(1), markup: match.slice(1) };
    },
  });
}

export const renderReactNodeView: RenderReactNodeView = {
  [tagNodeName]: ({ nodeViewRenderArg }) => {
    return <TagComponent tagValue={nodeViewRenderArg.node.attrs.tagValue} />;
  },
};

function TagComponent({ tagValue }) {
  const { dispatchAction } = useActionContext();

  const onClick = useCallback(() => {
    dispatchAction({
      name: '@action/search-notes/execute-search',
      value: `tag:${tagValue}`,
    });
  }, [tagValue, dispatchAction]);

  return (
    <span className="inline-note-tag" onClick={onClick}>
      #{tagValue}
    </span>
  );
}
