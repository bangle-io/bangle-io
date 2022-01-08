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

import { useSerialOperationContext } from '@bangle.io/action-context';
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
  DispatchSerialOperationType,
  EditorPluginMetadata,
} from '@bangle.io/shared-types';
import { cx } from '@bangle.io/utils';
import { getNote } from '@bangle.io/workspace-context';

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
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchSerialOperation } = useSerialOperationContext();
  const { bangleStore } = useEditorManagerContext();
  // Even though the collab extension will reset the content to its convenience
  // preloading the content will give us the benefit of static height, which comes
  // in handy when loading editor with a given scroll position.
  const [initialValue, setInitialDoc] = useState<Node | undefined>();

  useEffect(() => {
    let destroyed = false;

    getNote(wsPath)(bangleStore.state, bangleStore.dispatch).then((doc) => {
      if (!destroyed) {
        setInitialDoc(doc);
      }
    });
    return () => {
      destroyed = true;
    };
  }, [bangleStore, wsPath]);

  const editorRef = useRef<ReturnType<typeof Proxy.revocable> | null>(null);

  const onEditorReady = useCallback(
    (editor) => {
      // See the code below for explaination on why this exist.
      editorRef.current = Proxy.revocable(editor, {});

      setEditorReady(
        editorId,
        wsPath,
        editorRef.current.proxy as any,
      )(bangleStore.state, bangleStore.dispatch);

      // TODO this is currently used by the integration tests
      // we need a better way to do this
      if (typeof window !== 'undefined') {
        (window as any)[`editor-${editorId}`] = { editor, wsPath };
      }
    },
    [bangleStore, editorId, wsPath],
  );

  useEffect(() => {
    return () => {
      const editorProxy = editorRef.current;
      if (editorProxy) {
        setEditorUnmounted(editorId, editorProxy.proxy as any)(
          bangleStore.state,
          bangleStore.dispatch,
        );
        // Avoiding MEMORY LEAK
        // Editor object is a pretty massive object and writing idiomatic react
        // makes you use caching interfaces like useMemo, React.Memo etc, which
        // cache their dependencies. Caching majority of the things is fine, but
        // inadvertently caching an object like Editor causes major memory leaks.
        // There are various ways to avoid this problem like avoiding the usage of
        // editor in React components, or just being extra careful.
        // For the scope of this project, being careful is prone to errors, so a quick
        // and dirty approach is to put a revocable proxy in between rest of application
        // and the Editor instance.This works because we know for sure if an Editor has
        // been destroyed, we will never be reusing it, so we severe the reference by calling
        // `.revoke()` and let GC collect the Editor once it is destroyed. The timeout exists
        // just to give other places some time before the proxy is revoked.
        setTimeout(() => {
          editorProxy.revoke();
        }, 100);
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
      dispatchSerialOperation={dispatchSerialOperation}
      className={className}
      editorId={editorId}
      extensionRegistry={extensionRegistry}
      initialValue={initialValue}
      wsPath={wsPath}
      onEditorReady={onEditorReady}
      editorDisplayType={editorDisplayType}
      bangleStore={bangleStore}
    />
  ) : null;
}

function EditorInner2({
  className,
  dispatchSerialOperation,
  editorDisplayType,
  editorId,
  extensionRegistry,
  initialValue,
  onEditorReady,
  initialSelection,
  wsPath,
  bangleStore,
}: {
  className?: string;
  dispatchSerialOperation: DispatchSerialOperationType;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialValue: any;
  initialSelection: Selection | undefined;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: string;
  bangleStore: ReturnType<typeof useEditorManagerContext>['bangleStore'];
}) {
  const editorState = useGetEditorState({
    dispatchSerialOperation,
    editorDisplayType,
    editorId,
    extensionRegistry,
    initialSelection,
    initialValue,
    wsPath,
    bangleStore,
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
  dispatchSerialOperation,
  editorDisplayType,
  editorId,
  extensionRegistry,
  initialSelection,
  initialValue,
  wsPath,
  bangleStore,
}: {
  dispatchSerialOperation: DispatchSerialOperationType;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
  extensionRegistry: ExtensionRegistry;
  initialSelection: Selection | undefined;
  initialValue: any;
  wsPath: string;
  bangleStore: ReturnType<typeof useEditorManagerContext>['bangleStore'];
}) {
  const pluginMetadata: EditorPluginMetadata = useMemo(
    () => ({
      wsPath,
      editorId,
      editorDisplayType,
      dispatchSerialOperation,
      bangleStore,
    }),
    [editorId, wsPath, dispatchSerialOperation, bangleStore, editorDisplayType],
  );

  const plugins = useCallback(() => {
    return [
      // needs to be at top so that other plugins get depend on this
      valuePlugin(EditorPluginMetadataKey, pluginMetadata),
      ...extensionRegistry.getPlugins(),

      // Needs to be at bottom so that it can dispatch
      // operations for any plugin state updates before it
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
