import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_NOTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import {
  CenteredBoxedPage,
  ChevronDownIcon,
  NewNoteIcon,
} from '@bangle.io/ui-components';
import { removeMdExtension } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

const MAX_ENTRIES = 8;

function RecentNotes({ wsPaths }: { wsPaths: string[] }) {
  const formattedPaths = useMemo(() => {
    return wsPaths.map((wsPath) => {
      return resolvePath(wsPath);
    });
  }, [wsPaths]);
  return (
    <div className="mb-3">
      <div className="flex flex-row mt-6">
        <h3 className="mr-1 leading-none text-l sm:text-xl lg:text-xl">
          Recent notes
        </h3>
      </div>
      <ul className="my-2 ml-2 list-disc list-inside">
        {formattedPaths.map((r, i) => {
          return (
            <li key={i}>
              <Link to={r.locationPath} className="py-1 hover:underline">
                <span>{removeMdExtension(r.fileName)} </span>
                {r.dirPath && (
                  <span
                    className="font-light"
                    style={{ color: 'var(--textColor-1)' }}
                  >
                    {r.dirPath}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const EMPTY_ARRAY = [];
export function EmptyEditorPage() {
  const {
    wsName,
    recentlyUsedWsPaths = EMPTY_ARRAY,
    noteWsPaths,
  } = useWorkspaceContext();
  const { dispatchAction } = useActionContext();
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
      title={
        wsName && (
          <>
            <WorkspaceSpan wsName={wsName} />
            <ActionButton
              isQuiet="hoverBg"
              ariaLabel={'Switch workspace'}
              tooltipPlacement="right"
              tooltip={<TooltipWrapper>Switch workspace</TooltipWrapper>}
              onPress={() => {
                dispatchAction({
                  name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
                });
              }}
            >
              <ChevronDownIcon className="w-5 h-5" />
            </ActionButton>
          </>
        )
      }
      actions={
        <>
          <ActionButton
            ariaLabel="create note"
            onPress={() => {
              dispatchAction({
                name: CORE_ACTIONS_NEW_NOTE,
              });
            }}
          >
            <ButtonContent text="Create note" icon={<NewNoteIcon />} />
          </ActionButton>
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
