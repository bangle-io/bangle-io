import React, { useCallback } from 'react';

import type { BaseRawNodeSpec, RawSpecs } from '@bangle.dev/core';
import { domSerializationHelpers, NodeView } from '@bangle.dev/core';
import { inlineNodeParser } from '@bangle.dev/markdown';
import type { EditorState, EditorView } from '@bangle.dev/pm';
import { keymap } from '@bangle.dev/pm';

import { nsmApi2, useSerialOperationContext } from '@bangle.io/api';
import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import {
  inlinePalette,
  queryInlinePaletteActive,
  queryInlinePaletteText,
  replaceSuggestionMarkWith,
} from '@bangle.io/inline-palette';
import { assertNotUndefined } from '@bangle.io/utils';

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

        assertNotUndefined(nodeType, 'tag nodeType must be defined');

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
    getTokenDetails: (match, offset, srcText) => {
      let whiteSpaceBefore = false;

      if (USING_INFERIOR_REGEX) {
        // see the explanation in the source file of regex
        // due to the inferior regex for safari we get an extra whitespace
        // in the match
        if (match[0] === ' ') {
          match = match.slice(1);
          whiteSpaceBefore = true;
        }
      }

      return {
        payload: match.slice(1),
        markup: match.slice(1),
        whiteSpaceBefore,
      };
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
  const onClick = useCallback(() => {
    nsmApi2.editor.searchByTag(dispatchSerialOperation, tagValue);
  }, [tagValue, dispatchSerialOperation]);

  return (
    <span className="B-note-tags_inline-note-tag" onClick={onClick}>
      #{tagValue}
    </span>
  );
}
