import React, { useCallback } from 'react';

import {
  BaseRawNodeSpec,
  domSerializationHelpers,
  NodeView,
  RawSpecs,
} from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';
import { EditorState, EditorView, keymap } from '@bangle.dev/pm';

import {
  search,
  useBangleStoreContext,
  useSerialOperationContext,
} from '@bangle.io/api';
import { RenderReactNodeView } from '@bangle.io/extension-registry';
import {
  inlinePalette,
  queryInlinePaletteActive,
  queryInlinePaletteText,
  replaceSuggestionMarkWith,
} from '@bangle.io/inline-palette';

import {
  BANNED_CHARS,
  MARKDOWN_REGEX,
  paletteMarkName,
  palettePluginKey,
  tagNodeName,
  TRIGGER,
  USING_INFERIOR_REGEX,
} from './config';

const MAX_MATCH = 500;
const getScrollContainer = (view: EditorView) => {
  return view.dom.parentElement!;
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

function breakTag(key: string) {
  return (
    state: EditorState,
    dispatch: EditorView['dispatch'] | undefined,
    view: EditorView | undefined,
  ) => {
    if (queryInlinePaletteActive(palettePluginKey)(state)) {
      const text = queryInlinePaletteText(palettePluginKey)(state);
      const { $from } = state.selection;
      let textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - MAX_MATCH),
        $from.parentOffset,
        undefined,
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
      atom: true,
      draggable: true,
      toDOM,
      allowGapCursor: true,
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
          getAttrs: (tok: { payload: unknown }) => {
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

function TagComponent({ tagValue }: { tagValue: string }) {
  const { dispatchSerialOperation } = useSerialOperationContext();
  const bangleStore = useBangleStoreContext();
  const onClick = useCallback(() => {
    search.searchByTag(dispatchSerialOperation, tagValue)(bangleStore.state);
  }, [tagValue, dispatchSerialOperation, bangleStore]);

  return (
    <span className="b-note-tags_inline-note-tag" onClick={onClick}>
      #{tagValue}
    </span>
  );
}
