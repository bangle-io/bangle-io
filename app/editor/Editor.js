import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect } from 'react';

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

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
  grabFocus: PropTypes.bool,
};

export function Editor({ editorId, wsPath, grabFocus }) {
  const { sendRequest, setEditor, getEditor } = useContext(
    EditorManagerContext,
  );

  useEffect(() => {
    log('mounting editor', wsPath);
    return () => {
      log('unmounting editor', wsPath);
    };
  }, [wsPath]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!grabFocus) {
        return;
      }
      const editor = getEditor(editorId);

      if (editor && !editor.view.hasFocus()) {
        editor.view.focus();
      }
    });
  }, [getEditor, editorId, grabFocus]);

  const plugins = useCallback(() => {
    return getPlugins({ sendRequest, wsPath });
  }, [sendRequest, wsPath]);

  const onEditorReady = useCallback(
    (editor) => {
      setEditor(editorId, editor);
    },
    [setEditor, editorId],
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
}
