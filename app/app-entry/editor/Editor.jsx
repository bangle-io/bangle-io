import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import { ExtensionEditorComponents } from 'bangle-io-context/index';
import { getNote } from 'workspace/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
};

export function Editor({ editorId, wsPath, bangleIOContext, setEditor }) {
  // Even though the collab extension will reset the content to its convenience
  // preloading the content will give us the benefit of static height, which comes
  // in handy when loading editor with a given scroll position.
  const [initialValue, setInitialDoc] = useState();

  useEffect(() => {
    let destroyed = false;
    getNote(bangleIOContext, wsPath).then((doc) => {
      if (!destroyed) {
        setInitialDoc(doc);
      }
    });
    return () => {
      destroyed = true;
    };
  }, [bangleIOContext, wsPath]);

  return initialValue ? (
    <EditorInner
      editorId={editorId}
      wsPath={wsPath}
      setEditor={setEditor}
      bangleIOContext={bangleIOContext}
      initialValue={initialValue}
    />
  ) : null;
}

function EditorInner({
  editorId,
  wsPath,
  bangleIOContext,
  setEditor,
  initialValue,
}) {
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
    initialValue: initialValue,
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
