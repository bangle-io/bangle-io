import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';
import { BangleEditor, useEditorState } from '@bangle.dev/react';
import { ExtensionEditorComponents } from 'bangle-io-context/index';
import { getNote } from 'workspace/index';
import { getScrollParentElement } from 'utils/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
};

export function Editor({ editorId, wsPath, bangleIOContext, setEditor }) {
  // an object which can is used to provide extensions a store unique to this editor instance
  const [uniqueEditorObj] = useState({});
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

  useEffect(() => {
    if (initialValue) {
      const scrollParent = getScrollParentElement(editorId);
      const pos = bangleIOContext.editor.initialScrollPos({
        wsPath,
        editorId,
        scrollParent,
        doc: initialValue,
        uniqueEditorObj: uniqueEditorObj,
      });
      if (pos > 0) {
        scrollParent.scrollTop = pos;
      }
    }
  }, [editorId, wsPath, bangleIOContext, uniqueEditorObj, initialValue]);

  useEffect(() => {
    return () => {
      bangleIOContext.editor.beforeDestroy({
        wsPath,
        editorId,
        uniqueEditorObj: uniqueEditorObj,
      });
    };
  }, [wsPath, editorId, uniqueEditorObj, bangleIOContext]);

  return initialValue ? (
    <EditorInner
      editorId={editorId}
      wsPath={wsPath}
      setEditor={setEditor}
      bangleIOContext={bangleIOContext}
      initialValue={initialValue}
      uniqueEditorObj={uniqueEditorObj}
    />
  ) : null;
}

function EditorInner({
  editorId,
  wsPath,
  bangleIOContext,
  setEditor,
  initialValue,
  uniqueEditorObj,
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

      return bangleIOContext.renderReactNodeViews({
        nodeViewRenderArg,
        wsPath,
        editorId,
      });
    },
    [bangleIOContext, wsPath, editorId],
  );
  const editorState = useEditorState({
    plugins: plugins,
    pluginMetadata: {
      wsPath,
      editorId,
    },
    specRegistry: bangleIOContext.specRegistry,
    initialValue: initialValue,
    pmStateOpts: {
      selection: bangleIOContext.editor.initialSelection({
        wsPath,
        editorId,
        doc: initialValue,
        uniqueEditorObj: uniqueEditorObj,
      }),
    },
  });

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      focusOnInit={false}
      className="bangle-editor-inner-container"
    >
      <ExtensionEditorComponents
        bangleIOContext={bangleIOContext}
        wsPath={wsPath}
        editorId={editorId}
      />
    </BangleEditor>
  );
}
