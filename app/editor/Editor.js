import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect, useRef } from 'react';

import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import stopwatch from '@bangle.dev/react-stopwatch';
import sticker from '@bangle.dev/react-sticker';
import { EmojiSuggest } from '@bangle.dev/react-emoji-suggest';
import {
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
import { config } from 'config/index';
import {
  specRegistry,
  getPlugins,
  menuKey,
  emojiSuggestKey,
} from 'editor/index';
import { EditorManagerContext } from './EditorManager';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

export const Editor = React.memo(function Editor({
  isFirst,
  wsPath,
  paletteType,
}) {
  const { sendRequest, setPrimaryEditor, primaryEditor } = useContext(
    EditorManagerContext,
  );

  const editor = isFirst ? primaryEditor : null;

  useEffect(() => {
    // whenever paletteType goes undefined focus back on editor
    requestAnimationFrame(() => {
      if (editor && !editor.view.hasFocus() && paletteType == null) {
        editor.view.focus();
      }
    });
  }, [editor, paletteType]);

  const plugins = useCallback(() => {
    return getPlugins({ sendRequest, wsPath });
  }, [sendRequest, wsPath]);

  const onEditorReady = useCallback(
    (editor) => {
      if (isFirst) {
        window.editor = editor;
        setPrimaryEditor(editor);
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

      return () => {
        setPrimaryEditor(undefined);
      };
    },
    [isFirst, setPrimaryEditor],
  );

  const renderNodeViews = useCallback(
    ({ node, updateAttrs, children, selected }) => {
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
    },
    [],
  );

  const editorState = useEditorState({
    plugins: plugins,
    specRegistry,
  });

  useEffect(() => log('mounting editor', wsPath), [wsPath]);

  const renderMenuType = useCallback(({ type, menuKey }) => {
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
  }, []);

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      className="bangle-editor-inner-container"
    >
      <FloatingMenu menuKey={menuKey} renderMenuType={renderMenuType} />
      <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />
    </BangleEditor>
  );
});

Editor.propTypes = {
  isFirst: PropTypes.bool.isRequired,
  wsPath: PropTypes.string.isRequired,
  paletteType: PropTypes.string,
};
