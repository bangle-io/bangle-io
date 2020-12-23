import React from 'react';
import { PluginKey } from 'prosemirror-state';

import { getIdleCallback, uuid } from '@bangle.dev/core/utils/js-utils';
import * as collab from '@bangle.dev/collab/client/collab-extension';
import { collabRequestHandlers } from '@bangle.dev/collab/client/collab-request-handlers';
import * as coreComps from '@bangle.dev/core/components/index';
import { NodeView } from '@bangle.dev/core/node-view';
import { emoji, emojisArray } from '@bangle.dev/emoji/index';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import { BangleEditor } from '@bangle.dev/react';
import { useEditorState } from '@bangle.dev/react';
import stopwatch from '@bangle.dev/react-stopwatch';
import sticker from '@bangle.dev/react-sticker';
import { specRegistry } from '../editor/spec-sheet';
import { floatingMenu, FloatingMenu } from '@bangle.dev/react-menu';
import { EmojiSuggest, emojiSuggest } from '@bangle.dev/react-emoji-suggest';

const LOG = false;
const DEBUG = true;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

const getScrollContainer = (view) => {
  return view.dom.parentElement.parentElement;
};

const menuKey = new PluginKey('menuKey');
const emojiSuggestKey = new PluginKey('emojiSuggestKey');

export function Editor({ isFirst, manager, docName }) {
  const getPlugins = () => {
    const collabOpts = {
      docName: docName,
      clientId: 'client-' + uuid(4),
      ...collabRequestHandlers((...args) =>
        // TODO fix this resp.body
        manager.handleRequest(...args).then((resp) => resp.body),
      ),
    };
    return [
      floatingMenu.plugins({
        key: menuKey,
        tooltipRenderOpts: {
          getScrollContainer,
        },
      }),
      emojiSuggest.plugins({
        key: emojiSuggestKey,
        emojis: emojisArray,
        markName: 'emojiSuggest',
        tooltipRenderOpts: {
          getScrollContainer,
        },
      }),
      coreComps.bold.plugins(),
      coreComps.code.plugins(),
      coreComps.italic.plugins(),
      coreComps.strike.plugins(),
      coreComps.link.plugins(),
      coreComps.underline.plugins(),
      coreComps.paragraph.plugins(),
      coreComps.blockquote.plugins(),
      coreComps.bulletList.plugins(),
      coreComps.codeBlock.plugins(),
      coreComps.hardBreak.plugins(),
      coreComps.heading.plugins(),
      coreComps.horizontalRule.plugins(),
      coreComps.listItem.plugins(),
      coreComps.orderedList.plugins(),
      coreComps.todoItem.plugins({ nodeView: false }),
      coreComps.todoList.plugins(),
      coreComps.image.plugins(),
      coreComps.history.plugins(),
      collab.plugins(collabOpts),
      emoji.plugins(),
      stopwatch.plugins(),
      trailingNode.plugins(),
      timestamp.plugins(),
      sticker.plugins(),
      NodeView.createPlugin({
        name: 'todoItem',
        containerDOM: [
          'li',
          {
            'data-bangle-name': 'todoItem',
          },
        ],
        contentDOM: ['span', {}],
      }),
    ];
  };
  const onEditorReady = (editor) => {
    if (isFirst) {
      window.editor = editor;
      if (process.env.NODE_ENV !== 'integration') {
        getIdleCallback(() => {
          import(
            /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
          ).then((args) => {
            args.applyDevTools(editor.view);
          });
        });
      }
    }
  };
  const renderNodeViews = ({ node, updateAttrs, children, selected }) => {
    if (node.type.name === 'sticker') {
      return (
        <sticker.Sticker
          node={node}
          updateAttrs={updateAttrs}
          selected={selected}
        />
      );
    }

    if (node.type.name === 'stopwatch') {
      return <stopwatch.Stopwatch node={node} updateAttrs={updateAttrs} />;
    }

    if (node.type.name === 'todoItem') {
      return (
        <TodoItem node={node} updateAttrs={updateAttrs}>
          {children}
        </TodoItem>
      );
    }
  };

  const editorState = useEditorState({
    plugins: getPlugins,
    specRegistry,
  });

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
    >
      <FloatingMenu menuKey={menuKey} />
      <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />
    </BangleEditor>
  );
}

function TodoItem({ children, node, updateAttrs }) {
  const { done } = node.attrs;
  return (
    <>
      <span contentEditable={false}>
        <input
          type="checkbox"
          onChange={() => {
            updateAttrs({
              done: !done,
            });
          }}
          checked={!!done}
        />
      </span>
      {children}
    </>
  );
}

function isJestIntegration() {
  return process.env.NODE_ENV === 'test' && process.env.JEST_INTEGRATION;
}
