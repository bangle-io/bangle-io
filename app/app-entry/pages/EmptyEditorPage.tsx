import React, { useMemo } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CORE_OPERATIONS_NEW_NOTE, CorePalette } from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { pushWsPath, useWorkspaceContext } from '@bangle.io/slice-workspace';
import {
  Button,
  CenteredBoxedPage,
  ChevronDownIcon,
  Inline,
  NewNoteIcon,
} from '@bangle.io/ui-components';
import { removeExtension, resolvePath } from '@bangle.io/ws-path';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

const MAX_ENTRIES = 8;

function RecentNotes({ wsPaths }: { wsPaths: string[] }) {
  const bangleStore = useBangleStoreContext();

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
                  pushWsPath(r.wsPath)(bangleStore.state, bangleStore.dispatch);
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

const EMPTY_ARRAY: string[] = [];
export function EmptyEditorPage() {
  const {
    wsName,
    recentlyUsedWsPaths = EMPTY_ARRAY,
    noteWsPaths,
  } = useWorkspaceContext();
  const { dispatchSerialOperation } = useSerialOperationContext();
  const bangleStore = useBangleStoreContext();
  const paths = Array.from(
    new Set(
      [...recentlyUsedWsPaths, ...(noteWsPaths || EMPTY_ARRAY)].slice(
        0,
        MAX_ENTRIES,
      ),
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
              togglePaletteType(CorePalette.Workspace)(
                bangleStore.state,
                bangleStore.dispatch,
              );
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
