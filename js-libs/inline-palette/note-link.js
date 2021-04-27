import React from 'react';
import { NodeView } from '@bangle.dev/core/node-view';
import { domSerializationHelpers } from '@bangle.dev/core/utils/dom-serialization-helpers';
import { resolvePath } from 'workspace';

export const spec = specFactory;
export const plugins = pluginsFactory;
export const commands = {};

const name = 'noteLink';

function specFactory() {
  let spec = {
    type: 'node',
    name,
    schema: {
      attrs: {
        wsPath: {
          default: null,
        },
        title: {
          default: null,
        },
      },
      inline: true,
      group: 'inline',
      draggable: true,
    },
    markdown: {
      toMarkdown: (state, node) => {
        state.text('[[', false);
        state.text(resolvePath(node.attrs.wsPath).filePath, false);
        state.text(']]', false);
      },
    },
  };

  spec.schema = {
    ...spec.schema,
    ...domSerializationHelpers(name, { tag: 'span' }),
  };

  return spec;
}

function pluginsFactory() {
  return ({ schema }) => [
    NodeView.createPlugin({
      name,
      // inline-block allows the span to get full height of image
      // or else folks depending on the boundingBox get incorrect
      // dimensions.
      containerDOM: [
        'span',
        { style: 'display: inline-block;', class: 'note-link' },
      ],
    }),
  ];
}
