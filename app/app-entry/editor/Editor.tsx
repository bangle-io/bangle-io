import {
  BangleEditor,
  useEditorState,
  RenderNodeViewsFunction,
} from '@bangle.dev/react';
import { Node } from '@bangle.dev/pm';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getScrollParentElement } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { ExtensionRegistry } from 'extension-registry';
import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

Editor.propTypes = {
  wsPath: PropTypes.string.isRequired,
  editorId: PropTypes.number.isRequired,
};

export function Editor({
  editorId,
  wsPath,
  extensionRegistry,
  setEditor,
}: {
  extensionRegistry: ExtensionRegistry;
  editorId: number;
  wsPath: string;
  setEditor: (editorId: number, editor: CoreBangleEditor) => void;
}) {
  const { getNote } = useWorkspaceContext();
  // an object which can is used to provide extensions a store unique to this editor instance
  const [uniqueEditorObj] = useState({});
  // Even though the collab extension will reset the content to its convenience
  // preloading the content will give us the benefit of static height, which comes
  // in handy when loading editor with a given scroll position.
  const [initialValue, setInitialDoc] = useState<Node | undefined>();
  useEffect(() => {
    let destroyed = false;
    getNote(wsPath).then((doc) => {
      if (!destroyed) {
        setInitialDoc(doc);
      }
    });
    return () => {
      destroyed = true;
    };
  }, [getNote, wsPath]);

  useEffect(() => {
    if (initialValue) {
      const scrollParent = getScrollParentElement(editorId);
      const pos = extensionRegistry.editor.initialScrollPos({
        wsPath,
        editorId,
        scrollParent,
        doc: initialValue,
        uniqueEditorObj: uniqueEditorObj,
      });
      if (typeof pos === 'number' && scrollParent) {
        scrollParent.scrollTop = pos;
      }
    }
  }, [editorId, wsPath, extensionRegistry, uniqueEditorObj, initialValue]);

  useEffect(() => {
    return () => {
      extensionRegistry.editor.beforeDestroy({
        wsPath,
        editorId,
        uniqueEditorObj: uniqueEditorObj,
      });
    };
  }, [wsPath, editorId, uniqueEditorObj, extensionRegistry]);

  return initialValue ? (
    <EditorInner
      editorId={editorId}
      wsPath={wsPath}
      setEditor={setEditor}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
      uniqueEditorObj={uniqueEditorObj}
    />
  ) : null;
}

function EditorInner({
  editorId,
  wsPath,
  extensionRegistry,
  setEditor,
  initialValue,
  uniqueEditorObj,
}: {
  extensionRegistry: ExtensionRegistry;
  editorId: number;
  wsPath: string;
  setEditor: (editorId: number, editor: CoreBangleEditor) => void;
  initialValue: any;
  uniqueEditorObj: any;
}) {
  useEffect(() => {
    log('mounting editor', editorId, wsPath);
    return () => {
      log('unmounting editor', editorId, wsPath);
    };
  }, [wsPath, editorId]);

  const plugins = useCallback(() => {
    return extensionRegistry.getPlugins();
  }, [extensionRegistry]);

  const onEditorReady = useCallback(
    (editor) => {
      setEditor(editorId, editor);
      editor.focusView();
    },
    [setEditor, editorId],
  );

  const renderNodeViews: RenderNodeViewsFunction = useCallback(
    (nodeViewRenderArg) => {
      return extensionRegistry.renderReactNodeViews({
        nodeViewRenderArg,
        wsPath,
        editorId,
      });
    },
    [extensionRegistry, wsPath, editorId],
  );
  const editorState = useEditorState({
    plugins: plugins,
    pluginMetadata: {
      wsPath,
      editorId,
    },
    specRegistry: extensionRegistry.specRegistry,
    initialValue: initialValue,
    pmStateOpts: {
      selection: extensionRegistry.editor.initialSelection({
        wsPath,
        editorId,
        doc: initialValue,
        uniqueEditorObj: uniqueEditorObj,
      }),
    },
    editorProps: {},
  });

  return (
    <BangleEditor
      state={editorState}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      focusOnInit={false}
      className="bangle-editor-inner-container"
    >
      {extensionRegistry.renderExtensionEditorComponents({ wsPath, editorId })}
    </BangleEditor>
  );
}
