import PropTypes from 'prop-types';
import React, { useCallback, useEffect } from 'react';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
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

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      focusOnInit={false}
      className="bangle-editor-inner-container"
    >
      <ExtensionEditorComponents bangleIOContext={bangleIOContext} />
    </BangleEditor>
  );
}
