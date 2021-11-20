import React, { useCallback, useEffect, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import {
  BangleEditor,
  RenderNodeViewsFunction,
  useEditorState,
} from '@bangle.dev/react';

import {
  ExtensionRegistry,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import { getScrollParentElement } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

export function Editor({
  className,
  editorId,
  onEditorReady,
  wsPath,
}: {
  className?: string;
  editorId: number;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
}) {
  const { getNote } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
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
      className={className}
      editorId={editorId}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
      onEditorReady={onEditorReady}
      wsPath={wsPath}
    />
  ) : null;
}

function EditorInner({
  className,
  editorId,
  extensionRegistry,
  initialValue,
  onEditorReady,
  wsPath,
}: {
  className?: string;
  editorId: number;
  extensionRegistry: ExtensionRegistry;
  initialValue: any;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
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
    dropCursorOpts: {
      color: 'var(--accent-primary-0)',
      width: 2,
    },
  });

  return (
    <BangleEditor
      className={className}
      focusOnInit={false}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      state={editorState}
    >
      {extensionRegistry.renderExtensionEditorComponents({ wsPath, editorId })}
    </BangleEditor>
  );
}
