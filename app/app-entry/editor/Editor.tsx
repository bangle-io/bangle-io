import { ExtensionRegistry } from 'extension-registry';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';
import { getScrollParentElement } from 'utils';
import { useWorkspaceContext } from 'workspace-context';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import { Node } from '@bangle.dev/pm';
import {
  BangleEditor,
  RenderNodeViewsFunction,
  useEditorState,
} from '@bangle.dev/react';

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
      });
      if (typeof pos === 'number' && scrollParent) {
        scrollParent.scrollTop = pos;
      }
    }
  }, [editorId, wsPath, extensionRegistry, initialValue]);

  return initialValue ? (
    <EditorInner
      editorId={editorId}
      wsPath={wsPath}
      setEditor={setEditor}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
    />
  ) : null;
}

function EditorInner({
  editorId,
  wsPath,
  extensionRegistry,
  setEditor,
  initialValue,
}: {
  extensionRegistry: ExtensionRegistry;
  editorId: number;
  wsPath: string;
  setEditor: (editorId: number, editor: CoreBangleEditor) => void;
  initialValue: any;
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
