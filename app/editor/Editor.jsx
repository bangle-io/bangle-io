import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { BangleEditor, useEditorState } from '@bangle.dev/react';
import stopwatch from '@bangle.dev/react-stopwatch';
// import sticker from '@bangle.dev/react-sticker';
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
import {
  specRegistry,
  getPlugins,
  menuKey,
  emojiSuggestKey,
} from 'editor/index';
import { EditorManagerContext } from './EditorManager';
import { InlineCommandPalette } from './InlineCommandPalette';
import { InlineFilePalette } from './InlineFilePalette';
import { resolvePath } from 'workspace';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
};

export function Editor({ editorId, wsPath }) {
  const { sendRequest, setEditor } = useContext(EditorManagerContext);

  useEffect(() => {
    log('mounting editor', editorId, wsPath);
    return () => {
      log('unmounting editor', editorId, wsPath);
    };
  }, [wsPath, editorId]);

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
      // if (node.type.name === 'sticker') {
      //   return (
      //     <sticker.Sticker
      //       node={node}
      //       updateAttrs={updateAttrs}
      //       selected={selected}
      //     />
      //   );
      // }

      if (node.type.name === 'stopwatch') {
        return <stopwatch.Stopwatch node={node} updateAttrs={updateAttrs} />;
      }
      if (node.type.name === 'noteLink') {
        return (
          <Link to={resolvePath(node.attrs.wsPath).locationPath}>
            [[{node.attrs.title}]]
          </Link>
        );
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
      focusOnInit={false}
      className="bangle-editor-inner-container"
    >
      <FloatingMenu menuKey={menuKey} renderMenuType={renderMenuType} />
      <EmojiSuggest emojiSuggestKey={emojiSuggestKey} />
      <InlineCommandPalette />
      <InlineFilePalette />
    </BangleEditor>
  );
}
