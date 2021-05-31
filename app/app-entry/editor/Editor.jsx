import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect } from 'react';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
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
import { menuKey } from 'editor/index';
import { ExtensionEditorComponents } from 'bangle-io-context/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
};

export function Editor({ editorId, wsPath, bangleIOContext, setEditor }) {
  useEffect(() => {
    log('mounting editor', editorId, wsPath);
    return () => {
      log('unmounting editor', editorId, wsPath);
    };
  }, [wsPath, editorId]);

  const plugins = useCallback(() => {
    return bangleIOContext.getPlugins();
  }, [bangleIOContext]);

  const onEditorReady = useCallback(
    (editor) => {
      setEditor(editorId, editor);
    },
    [setEditor, editorId],
  );

  const renderNodeViews = useCallback(
    (nodeViewRenderArg) => {
      const { node, updateAttrs, children, selected } = nodeViewRenderArg;

      return bangleIOContext.renderReactNodeViews(nodeViewRenderArg);
    },
    [bangleIOContext],
  );

  const editorState = useEditorState({
    plugins: plugins,
    pluginMetadata: {
      wsPath,
    },
    specRegistry: bangleIOContext.specRegistry,
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
      <ExtensionEditorComponents bangleIOContext={bangleIOContext} />
    </BangleEditor>
  );
}
