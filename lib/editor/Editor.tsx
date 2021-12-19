import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import type { Node, Selection } from '@bangle.dev/pm';
import {
  BangleEditor as ReactBangleEditor,
  RenderNodeViewsFunction,
  useEditorState,
} from '@bangle.dev/react';
import { valuePlugin } from '@bangle.dev/utils';

import { useActionContext } from '@bangle.io/action-context';
import {
  EditorDisplayType,
  EditorPluginMetadataKey,
} from '@bangle.io/constants';
import {
  getInitialSelection,
  setEditorReady,
  setEditorUnmounted,
  useEditorManagerContext,
} from '@bangle.io/editor-manager-context';
import {
  ExtensionRegistry,
  useExtensionRegistryContext,
} from '@bangle.io/extension-registry';
import type {
  DispatchActionType,
  EditorPluginMetadata,
} from '@bangle.io/shared-types';
import { cx } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { watchPluginHost } from './watch-plugin-host';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

export interface EditorProps {
  className?: string;
  editorId?: number;
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
  wsPath,
  editorDisplayType = EditorDisplayType.Page,
}: EditorProps) {
  const { getNote } = useWorkspaceContext();
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchAction } = useActionContext();
  const { bangleStore } = useEditorManagerContext();

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

  const editorRef = useRef<CoreBangleEditor | null>(null);

  const onEditorReady = useCallback(
    (editor) => {
      editorRef.current = editor;
      setEditorReady(
        editorId,
        wsPath,
        editor,
      )(bangleStore.state, bangleStore.dispatch);
    },
    [bangleStore, editorId, wsPath],
  );

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        setEditorUnmounted(editorId, editorRef.current)(
          bangleStore.state,
          bangleStore.dispatch,
        );
      }
    };
  }, [editorId, wsPath, bangleStore]);

  const initialSelection =
    editorId != null && initialValue
      ? getInitialSelection(editorId, wsPath, initialValue)(bangleStore.state)
      : undefined;

  return initialValue ? (
    <EditorInner2
      initialSelection={initialSelection}
      dispatchAction={dispatchAction}
      className={className}
      editorId={editorId}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
      wsPath={wsPath}
      onEditorReady={onEditorReady}
      editorDisplayType={editorDisplayType}
    />
  ) : null;
}

function EditorInner2({
  className,
  dispatchAction,
  editorDisplayType,
  editorId,
  extensionRegistry,
  initialValue,
  onEditorReady,
  initialSelection,
  wsPath,
}: {
  className?: string;
  dispatchAction: DispatchActionType;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialValue: any;
  initialSelection: Selection | undefined;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
}) {
  const editorState = useGetEditorState({
    dispatchAction,
    editorDisplayType,
    editorId,
    extensionRegistry,
    initialSelection,
    initialValue,
    wsPath,
  });

  const renderNodeViews: RenderNodeViewsFunction = useCallback(
    (nodeViewRenderArg) => {
      return extensionRegistry.renderReactNodeViews({
        nodeViewRenderArg,
      });
    },
    [extensionRegistry],
  );

  let displayClass = 'editor_editor-display-page';
  switch (editorDisplayType) {
    case EditorDisplayType.Page: {
      displayClass = 'editor_editor-display-page';
      break;
    }
    case EditorDisplayType.Popup: {
      displayClass = 'editor_editor-display-popup';
      break;
    }
  }

  return (
    <ReactBangleEditor
      className={cx(className, displayClass)}
      focusOnInit={false}
      onReady={onEditorReady}
      renderNodeViews={renderNodeViews}
      state={editorState}
    >
      {extensionRegistry.renderExtensionEditorComponents()}
    </ReactBangleEditor>
  );
}

export function useGetEditorState({
  dispatchAction,
  editorDisplayType,
  editorId,
  extensionRegistry,
  initialSelection,
  initialValue,
  wsPath,
}: {
  dispatchAction: DispatchActionType;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialSelection: Selection | undefined;
  initialValue: any;
  wsPath: string;
}) {
  const pluginMetadata: EditorPluginMetadata = useMemo(
    () => ({
      wsPath,
      editorId,
      editorDisplayType,
      dispatchAction,
    }),
    [editorId, wsPath, dispatchAction, editorDisplayType],
  );

  const plugins = useCallback(() => {
    return [
      // needs to be at top so that other plugins get depend on this
      valuePlugin(EditorPluginMetadataKey, pluginMetadata),
      ...extensionRegistry.getPlugins(),

      // Needs to be at bottom so that it can dispatch
      // actions for any plugin state updates before it
      watchPluginHost(
        pluginMetadata,
        extensionRegistry.getEditorWatchPluginStates(),
      ),
    ];
  }, [extensionRegistry, pluginMetadata]);

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
