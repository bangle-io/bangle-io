import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import {
  BangleEditor,
  RenderNodeViewsFunction,
  useEditorState,
} from '@bangle.dev/react';
import { valuePlugin } from '@bangle.dev/utils';

import {
  EditorDisplayType,
  EditorPluginMetadataKey,
} from '@bangle.io/constants';
import {
  ExtensionRegistry,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { cx, getScrollParentElement } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

interface EditorProps {
  className?: string;
  editorId?: number;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
  editorDisplayType?: EditorDisplayType;
}

export function Editor(props: EditorProps) {
  // using key=wsPath to force unmount and mount the editor
  // with fresh values
  return <EditorInner key={props.wsPath} {...props} />;
}

function EditorInner({
  className,
  editorId,
  onEditorReady,
  wsPath,
  editorDisplayType = EditorDisplayType.Page,
}: EditorProps) {
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
    if (initialValue && editorId != null) {
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
    <EditorInner2
      className={className}
      editorId={editorId}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
      onEditorReady={onEditorReady}
      wsPath={wsPath}
      editorDisplayType={editorDisplayType}
    />
  ) : null;
}

function EditorInner2({
  className,
  editorId,
  extensionRegistry,
  initialValue,
  onEditorReady,
  wsPath,
  editorDisplayType,
}: {
  className?: string;
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialValue: any;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
  editorDisplayType: EditorDisplayType;
}) {
  useEffect(() => {
    log('mounting editor');
    return () => {
      log('unmounting editor');
    };
  }, []);

  const editorState = useGetEditorState({
    editorId,
    extensionRegistry,
    initialValue,
    wsPath,
    editorDisplayType,
  });

  const renderNodeViews: RenderNodeViewsFunction = useCallback(
    (nodeViewRenderArg) => {
      return extensionRegistry.renderReactNodeViews({
        nodeViewRenderArg,
      });
    },
    [extensionRegistry],
  );

  let displayClass = 'editor-display-page';
  switch (editorDisplayType) {
    case EditorDisplayType.Page: {
      displayClass = 'editor-display-page';
      break;
    }
    case EditorDisplayType.Popup: {
      displayClass = 'editor-display-popup';
      break;
    }
  }

  return (
    <BangleEditor
      className={cx(className, displayClass)}
      focusOnInit={false}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      state={editorState}
    >
      {extensionRegistry.renderExtensionEditorComponents()}
    </BangleEditor>
  );
}

export function useGetEditorState({
  editorId,
  extensionRegistry,
  initialValue,
  wsPath,
  editorDisplayType,
}: {
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialValue: any;
  wsPath: string;
  editorDisplayType: EditorDisplayType;
}) {
  const pluginMetadata: EditorPluginMetadata = useMemo(
    () => ({
      wsPath,
      editorId,
      editorDisplayType,
    }),
    [editorId, wsPath, editorDisplayType],
  );

  const plugins = useCallback(() => {
    return [
      valuePlugin(EditorPluginMetadataKey, pluginMetadata),
      ...extensionRegistry.getPlugins(),
    ];
  }, [extensionRegistry, pluginMetadata]);

  const initialSelection =
    editorId == null
      ? undefined
      : extensionRegistry.editor.initialSelection({
          wsPath,
          editorId,
          doc: initialValue,
        });

  const editorState = useEditorState({
    plugins,
    pluginMetadata,
    specRegistry: extensionRegistry.specRegistry,
    initialValue,
    pmStateOpts: {
      selection: initialSelection,
    },
    editorProps: {},
    dropCursorOpts: {
      color: 'var(--accent-primary-0)',
      width: 2,
    },
  });

  return editorState;
}
