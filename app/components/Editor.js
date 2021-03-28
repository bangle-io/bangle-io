import React, { useContext, useEffect, useState } from 'react';
import { PluginKey } from '@bangle.dev/core/prosemirror/state';
import { uuid, getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import * as collab from '@bangle.dev/collab/client/collab-extension';
import * as coreComps from '@bangle.dev/core/components/index';
import { emoji, emojisArray } from '@bangle.dev/emoji/index';
import { trailingNode } from '@bangle.dev/trailing-node';
import { timestamp } from '@bangle.dev/timestamp';
import { BangleEditor } from '@bangle.dev/react';
import { useEditorState } from '@bangle.dev/react';
import stopwatch from '@bangle.dev/react-stopwatch';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import sticker from '@bangle.dev/react-sticker';
import { EmojiSuggest, emojiSuggest } from '@bangle.dev/react-emoji-suggest';
import {
  floatingMenu,
  FloatingMenu,
  Menu,
  MenuGroup,
  BoldButton,
  ItalicButton,
  CodeButton,
  FloatingLinkButton,
  HeadingButton,
  BulletListButton,
  LinkSubMenu,
  OrderedListButton,
  TodoListButton,
} from '@bangle.dev/react-menu';
import { collapsibleHeadingDeco } from '../editor/collapsible-heading-deco';
import { config } from 'bangle-io/config';

import { specRegistry } from '../editor/spec-sheet';
import { EditorManagerContext } from '../editor/EditorManager';
import { UIManagerContext } from '../UIManager';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

const getScrollContainer = (view) => {
  return view.dom.parentElement.parentElement;
};

const menuKey = new PluginKey('menuKey');
const emojiSuggestKey = new PluginKey('emojiSuggestKey');

export function Editor({ isFirst, wsPath }) {
  const [editor, setEditor] = useState();
  const { sendRequest } = useContext(EditorManagerContext);
  const { paletteType } = useContext(UIManagerContext);

  usePersistSelection(wsPath, isFirst, editor);

  useEffect(() => {
    // whenever paletteType goes undefined focus back on editor
    if (editor && !editor.view.hasFocus() && paletteType == null) {
      editor.view.focus();
    }
  }, [editor, paletteType]);

  const getPlugins = () => {
    const collabOpts = {
      docName: wsPath,
      clientId: 'client-' + uuid(4),

      async getDocument({ docName, userId }) {
        // log({ docName, userId });
        return sendRequest('get_document', {
          docName,
          userId,
        });
      },

      async pullEvents({ version, docName, userId }) {
        // log({ version, docName, userId });
        return sendRequest('get_events', {
          docName,
          version,
          userId,
        });
      },

      async pushEvents({ version, steps, clientID, docName, userId }) {
        // log({ version, steps, clientID, docName, userId });
        return sendRequest('push_events', {
          clientID,
          version,
          steps,
          docName,
          userId,
        });
      },
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
      coreComps.heading.plugins({
        keybindings: {
          ...coreComps.heading.defaultKeys,
          toggleCollapse: 'Shift-Meta-1',
          toH4: null,
          toH5: null,
          toH6: null,
        },
      }),
      coreComps.horizontalRule.plugins(),
      coreComps.listItem.plugins(),
      coreComps.orderedList.plugins(),
      coreComps.image.plugins(),
      coreComps.history.plugins(),
      collab.plugins(collabOpts),
      emoji.plugins(),
      stopwatch.plugins(),
      trailingNode.plugins(),
      timestamp.plugins(),
      sticker.plugins(),
      collapsibleHeadingDeco.plugins(),
    ];
  };
  const onEditorReady = (editor) => {
    if (isFirst) {
      window.editor = editor;
      setEditor(editor);
      if (!config.isIntegration) {
        getIdleCallback(() => {
          // import(
          //   /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
          // ).then((args) => {
          //   args.applyDevTools(editor.view);
          // });
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
  };

  const editorState = useEditorState({
    plugins: getPlugins,
    specRegistry,
  });

  useEffect(() => log('mounting editor', wsPath), [wsPath]);
  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
    >
      <FloatingMenu
        menuKey={menuKey}
        renderMenuType={({ type, menuKey }) => {
          if (type === 'defaultMenu') {
            return (
              <Menu>
                <MenuGroup>
                  <BoldButton />
                  <ItalicButton />
                  <CodeButton />
                  <FloatingLinkButton menuKey={menuKey} />
                </MenuGroup>
                <MenuGroup>
                  <HeadingButton level={2} />
                  <HeadingButton level={3} />
                  <BulletListButton />
                  <TodoListButton />
                  <OrderedListButton />
                </MenuGroup>
              </Menu>
            );
          }
          if (type === 'linkSubMenu') {
            return (
              <Menu>
                <LinkSubMenu />
              </Menu>
            );
          }
          return null;
        }}
      />
      <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />
    </BangleEditor>
  );
}

const cache = new Map();
function usePersistSelection(wsPath, isFirst, editor) {
  useEffect(() => {
    const key = 'editorLastHead/' + wsPath;
    const { selectionHead } = cache.get(key) || {};

    if (editor && wsPath && isFirst && selectionHead > 0) {
      // delay it a bit
      requestAnimationFrame(() => {
        cache.delete(key);
        const { state, dispatch } = editor.view;
        const SelectionAtStart =
          state.selection.from === Selection.atStart(state.doc);

        log('dispatching selection moved', wsPath);
        if (
          selectionHead < state.doc.content.size &&
          selectionHead > 0 &&
          !SelectionAtStart
        ) {
          let { tr } = state;
          log('dispatching location', selectionHead);
          tr = tr
            .setSelection(Selection.near(tr.doc.resolve(selectionHead)))
            .scrollIntoView();
          dispatch(tr);
        }
      });
    }
    return () => {
      if (editor?.view && isFirst && wsPath) {
        const selectionHead = editor.view.state.selection.head;
        log('saving position', key, selectionHead);
        cache.set(key, {
          selectionHead,
        });
      }
    };
  }, [wsPath, isFirst, editor]);
}
