import React, { useEffect } from 'react';

import {
  getEternalVars,
  useNsmSliceDispatch,
  useNsmSliceState,
  useNsmStore,
} from '@bangle.io/bangle-store-context';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
  SEVERITY,
} from '@bangle.io/constants';
import { EditorContainer, MiniEditor } from '@bangle.io/editor-container';
import {
  nsmSliceWorkspace,
  pushOpenedWsPaths,
} from '@bangle.io/nsm-slice-workspace';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { MultiColumnMainContent } from '@bangle.io/ui-dhancha';
import { createWsPath } from '@bangle.io/ws-path';

import { EmptyEditorPage } from './EmptyEditorPage';

export function WorkspacePage() {
  const { widescreen } = useNsmSliceState(nsmUISlice);

  const notificationDispatch = useNsmSliceDispatch(
    nsmNotification.nsmNotificationSlice,
  );
  const { miniWsPath, openedWsPaths } = useNsmSliceState(nsmSliceWorkspace);

  const store = useNsmStore([nsmSliceWorkspace, nsmPageSlice]);

  const eternalVars = getEternalVars(store);
  const { primaryWsPath, secondaryWsPath } = openedWsPaths;

  let mini = null;

  if (miniWsPath) {
    if (widescreen) {
      mini = <MiniEditor wsPath={miniWsPath} eternalVars={eternalVars} />;
    }
  }

  useEffect(() => {
    if (miniWsPath && !widescreen) {
      notificationDispatch(
        nsmNotification.showNotification({
          title: 'Mini Editor is not available in small screens',
          uid: 'mini-editor-not-available',
          severity: SEVERITY.WARNING,
          transient: true,
        }),
      );

      store.dispatch(
        pushOpenedWsPaths((openedWsPaths) =>
          openedWsPaths.updateMiniEditorWsPath(undefined),
        ),
      );
    }
  }, [store, miniWsPath, notificationDispatch, widescreen]);

  return (
    <>
      <MultiColumnMainContent>
        {!primaryWsPath && !secondaryWsPath && <EmptyEditorPage />}
        {primaryWsPath && (
          <EditorContainer
            widescreen={widescreen}
            editorId={PRIMARY_EDITOR_INDEX}
            wsPath={createWsPath(primaryWsPath)}
            eternalVars={eternalVars}
          />
        )}
        {/* avoid split screen for small screens */}
        {widescreen && secondaryWsPath && (
          <EditorContainer
            widescreen={widescreen}
            editorId={SECONDARY_EDITOR_INDEX}
            wsPath={createWsPath(secondaryWsPath)}
            eternalVars={eternalVars}
          />
        )}
      </MultiColumnMainContent>
      {mini}
    </>
  );
}
