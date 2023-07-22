import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';
import type { Node, Selection } from '@bangle.dev/pm';
import type { RenderNodeViewsFunction } from '@bangle.dev/react';
import {
  BangleEditor as ReactBangleEditor,
  useEditorState,
} from '@bangle.dev/react';
import { valuePlugin } from '@bangle.dev/utils';

import {
  useNsmPlainStore,
  useNsmStore,
  useSerialOperationContext,
} from '@bangle.io/api';
import { EditorDisplayType } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { EditorPluginMetadataKey } from '@bangle.io/editor-common';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type {
  DispatchSerialOperationType,
  EditorPluginMetadata,
  EternalVars,
  NsmStore,
  WsPath,
} from '@bangle.io/shared-types';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import {
  getEditor,
  getInitialSelection,
  nsmEditorManagerSlice,
  setEditor,
  setEditorScrollPos,
  updateSelection,
} from '@bangle.io/slice-editor-manager';
import { calculateSelection } from '@bangle.io/slice-editor-manager/utils';
import { cx } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';

import { watchPluginHost } from './watch-plugin-host';

const LOG = false;
let log = LOG ? console.log.bind(console, 'play/Editor') : () => {};

export interface EditorProps {
  className?: string;
  editorDisplayType?: EditorDisplayType;
  editorId: EditorIdType;
  eternalVars: EternalVars;
  wsPath: WsPath;
}

export function Editor(props: EditorProps) {
  // using key=wsPath to force unmount and mount the editor
  // with fresh values
  return <EditorInner key={props.wsPath} {...props} />;
}

function EditorInner({
  className,
  editorDisplayType = EditorDisplayType.Page,
  editorId,
  eternalVars,
  wsPath,
}: EditorProps) {
  const { dispatchSerialOperation } = useSerialOperationContext();
  const editorStore = useNsmStore([nsmEditorManagerSlice, nsmSliceWorkspace]);
  const nsmStore = useNsmPlainStore();
  // Even though the collab extension will reset the content to its convenience
  // preloading the content will give us the benefit of static height, which comes
  // in handy when loading editor with a given scroll position.
  const [initialValue, setInitialDoc] = useState<Node | undefined>();

  useEffect(() => {
    let destroyed = false;

    fs.getNote(wsPath, eternalVars.extensionRegistry).then((doc) => {
      if (!destroyed) {
        setInitialDoc(doc);
      }
    });

    return () => {
      destroyed = true;
    };
  }, [wsPath, eternalVars.extensionRegistry]);

  const editorRef = useRef<ReturnType<typeof Proxy.revocable> | null>(null);

  const _onEditorReady = useCallback(
    (editor) => {
      const proxiedEditor = Proxy.revocable(editor, {});
      editorRef.current = proxiedEditor;

      setEditorScrollPos(editorStore.state, wsPath, editorId);
      editorStore.dispatch(
        setEditor({
          editorId,
          editor: proxiedEditor.proxy,
        }),
      );
    },
    [editorStore, wsPath, editorId],
  );

  useEffect(() => {
    return () => {
      const editorProxy = editorRef.current;

      if (editorProxy) {
        editorRef.current = null;

        const currentEditor = getEditor(editorStore.state, editorId);

        // make sure we are unsetting the correct editor
        if (currentEditor === editorProxy.proxy) {
          editorStore.dispatch(
            setEditor({
              editor: undefined,
              editorId,
            }),
          );
          // update the last selection before unmounting
          const value = calculateSelection(editorId, currentEditor);
          editorStore.dispatch(updateSelection(value));
        }

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
  }, [editorId, editorStore]);

  const initialSelection =
    editorId != null && initialValue
      ? getInitialSelection(editorStore.state, editorId, wsPath, initialValue)
      : undefined;

  return initialValue ? (
    <EditorInner2
      nsmStore={nsmStore}
      initialSelection={initialSelection}
      dispatchSerialOperation={dispatchSerialOperation}
      className={className}
      editorId={editorId}
      eternalVars={eternalVars}
      initialValue={initialValue}
      wsPath={wsPath}
      onEditorReady={_onEditorReady}
      editorDisplayType={editorDisplayType}
    />
  ) : null;
}

function EditorInner2({
  nsmStore,
  className,
  dispatchSerialOperation,
  editorDisplayType,
  editorId,
  eternalVars,
  initialValue,
  onEditorReady,
  initialSelection,
  wsPath,
}: {
  eternalVars: EternalVars;
  nsmStore: NsmStore;
  className?: string;
  dispatchSerialOperation: DispatchSerialOperationType;
  editorDisplayType: EditorDisplayType;
  editorId?: EditorIdType;
  initialValue: any;
  initialSelection: Selection | undefined;
  onEditorReady?: (editor: CoreBangleEditor) => void;
  wsPath: WsPath;
}) {
  const editorState = useGetEditorState({
    dispatchSerialOperation,
    editorDisplayType,
    editorId,
    eternalVars,
    initialSelection,
    initialValue,
    wsPath,
    nsmStore,
  });

  const renderNodeViews: RenderNodeViewsFunction = useCallback(
    (nodeViewRenderArg) => {
      return eternalVars.extensionRegistry.renderReactNodeViews({
        nodeViewRenderArg,
      });
    },
    [eternalVars],
  );

  let displayClass = 'B-editor_display-page';
  switch (editorDisplayType) {
    case EditorDisplayType.Page: {
      displayClass = 'B-editor_display-page';
      break;
    }
    case EditorDisplayType.Floating: {
      displayClass = 'B-editor_display-popup';
      break;
    }
    default: {
      // hack to catch switch slipping
      let val: never = editorDisplayType;
      throw new Error('Unknown error type ' + val);
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
      {eternalVars.extensionRegistry.renderExtensionEditorComponents()}
    </ReactBangleEditor>
  );
}

export function useGetEditorState({
  dispatchSerialOperation,
  editorDisplayType,
  editorId,
  initialSelection,
  initialValue,
  wsPath,
  nsmStore,
  eternalVars,
}: {
  nsmStore: NsmStore;
  dispatchSerialOperation: DispatchSerialOperationType;
  editorDisplayType: EditorDisplayType;
  editorId?: EditorIdType;
  eternalVars: EternalVars;
  initialSelection: Selection | undefined;
  initialValue: any;
  wsPath: WsPath;
}) {
  // TODO decouple pluginMetadata, this should be provided as a prop
  const pluginMetadata: EditorPluginMetadata = useMemo(
    () => ({
      wsPath,
      editorId,
      editorDisplayType,
      dispatchSerialOperation,
      nsmStore,
      createdAt: Date.now(),
      collabMessageBus: eternalVars.editorCollabMessageBus,
    }),

    [
      editorId,
      nsmStore,
      wsPath,
      dispatchSerialOperation,
      editorDisplayType,
      eternalVars,
    ],
  );

  const plugins = useCallback(() => {
    return [
      // needs to be at top so that other plugins get depend on this
      valuePlugin(EditorPluginMetadataKey, pluginMetadata),
      ...eternalVars.extensionRegistry.getPlugins(),

      // Needs to be at bottom so that it can dispatch
      // operations for any plugin state updates before it
      watchPluginHost(
        pluginMetadata,
        eternalVars.extensionRegistry.getEditorWatchPluginStates(),
      ),
    ];
  }, [eternalVars, pluginMetadata]);

  const editorState = useEditorState({
    plugins,
    pluginMetadata,
    specRegistry: eternalVars.extensionRegistry.specRegistry,
    initialValue,
    pmStateOpts: {
      selection: initialSelection,
    },
    editorProps: {},
    dropCursorOpts: {
      color: vars.color.promote.solidStrong,
      width: 2,
    },
  });

  return editorState;
}
