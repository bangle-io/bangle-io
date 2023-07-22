import React, { useMemo } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import {
  useNsmPlainStore,
  useNsmSlice,
  useNsmSliceState,
} from '@bangle.io/bangle-store-context';
import { CORE_OPERATIONS_NEW_NOTE, CorePalette } from '@bangle.io/constants';
import {
  nsmSliceWorkspace,
  pushOpenedWsPaths,
} from '@bangle.io/nsm-slice-workspace';
import type { WsPath } from '@bangle.io/shared-types';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Button, CenteredBoxedPage } from '@bangle.io/ui-components';
import { removeExtension, resolvePath } from '@bangle.io/ws-path';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

const MAX_ENTRIES = 8;

function RecentNotes({ wsPaths }: { wsPaths: string[] }) {
  const nsmStore = useNsmPlainStore();

  const formattedPaths = useMemo(() => {
    return wsPaths.map((wsPath) => {
      return resolvePath(wsPath);
    });
  }, [wsPaths]);

  return (
    <div className="mb-3">
      <div className="flex flex-row mt-6">
        <h3 className="mr-1 leading-none text-lg smallscreen:text-xl lg:text-xl">
          Recent notes
        </h3>
      </div>
      <ul className="my-2 ml-2 list-disc list-inside">
        {formattedPaths.map((r, i) => {
          return (
            <li key={i}>
              <button
                role="link"
                onClick={(e) => {
                  nsmStore.dispatch(
                    pushOpenedWsPaths((openedWsPath) => {
                      return openedWsPath.updatePrimaryWsPath(r.wsPath);
                    }),
                  );
                }}
                className="py-1 hover:underline"
              >
                <span>{removeExtension(r.fileName)} </span>
                {r.dirPath && (
                  <span className="font-light text-colorNeutralTextSubdued">
                    {r.dirPath}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const EMPTY_ARRAY: WsPath[] = [];
export function EmptyEditorPage() {
  const {
    wsName,
    recentWsPaths = EMPTY_ARRAY,
    noteWsPaths,
  } = useNsmSliceState(nsmSliceWorkspace);
  const { dispatchSerialOperation } = useSerialOperationContext();
  const [, uiDispatch] = useNsmSlice(nsmUISlice);
  const paths = Array.from(
    new Set(
      [...recentWsPaths, ...(noteWsPaths || EMPTY_ARRAY)].slice(0, MAX_ENTRIES),
    ),
  );

  return (
    <CenteredBoxedPage
      dataTestId="app-app-entry_pages-empty-editor-page"
      title={wsName && <WorkspaceSpan wsName={wsName} />}
      actions={
        <>
          <Button
            ariaLabel="Switch workspace"
            tooltipPlacement="right"
            text="Switch workspace"
            onPress={() => {
              uiDispatch(nsmUI.togglePalette(CorePalette.Workspace));
            }}
          />
          <Button
            ariaLabel="create note"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_NOTE,
              });
            }}
            text="Create note"
          />
        </>
      }
    >
      {paths.length !== 0 ? (
        <RecentNotes wsPaths={paths} />
      ) : (
        <div className="mb-3">You do not have any notes in this workspace</div>
      )}
    </CenteredBoxedPage>
  );
}
