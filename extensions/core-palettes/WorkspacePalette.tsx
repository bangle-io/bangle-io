import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { keyDisplayValue } from '@bangle.io/config';
import {
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { goToWsNameRoute, listWorkspaces } from '@bangle.io/slice-workspace';
import {
  AlbumIcon,
  CloseIcon,
  UniversalPalette,
} from '@bangle.io/ui-components';

import type { ExtensionPaletteType } from './config';
import { useRecencyWatcher } from './hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

const identifierPrefix = 'ws:';

const storageKey = 'WorkspacePaletteUIComponent/1';

const WorkspacePaletteUIComponent: ExtensionPaletteType['ReactComponent'] =
  React.forwardRef(
    ({ query, dismissPalette, onSelect, getActivePaletteItem }, ref) => {
      const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);

      const bangleStore = useBangleStoreContext();

      const [workspaces, updateWorkspaces] = useState<WorkspaceInfo[]>([]);

      const { dispatchSerialOperation } = useSerialOperationContext();
      useEffect(() => {
        listWorkspaces()(
          bangleStore.state,
          bangleStore.dispatch,
          bangleStore,
        ).then((wsInfo) => {
          updateWorkspaces(wsInfo);
        });
      }, [bangleStore]);

      const items = useMemo(() => {
        const _items = injectRecency(
          workspaces
            .filter((ws) => {
              return strMatch(ws.name, query);
            })
            .map((workspaceObj, i) => {
              return {
                uid: `${workspaceObj.name}-(${workspaceObj.type})`,
                title: workspaceObj.name,
                extraInfo: workspaceObj.type,
                data: { workspace: workspaceObj },
                rightHoverNode: (
                  <CloseIcon
                    style={{
                      height: 16,
                      width: 16,
                    }}
                    onClick={async (e: React.MouseEvent<any>) => {
                      e.stopPropagation();
                      dispatchSerialOperation({
                        name: CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
                        value: workspaceObj.name,
                      });
                      dismissPalette();
                    }}
                  />
                ),
              };
            }),
        );

        return _items;
      }, [
        query,
        dismissPalette,
        dispatchSerialOperation,
        workspaces,
        injectRecency,
      ]);

      const activeItem = getActivePaletteItem(items);

      const onExecuteItem = useCallback(
        (getUid, sourceInfo) => {
          const uid = getUid(items);
          const item = items.find((item) => item.uid === uid);

          if (item) {
            goToWsNameRoute(item.data.workspace.name, {
              newTab: sourceInfo.metaKey,
              reopenPreviousEditors: false,
            })(bangleStore.state, bangleStore.dispatch);

            updateRecency(uid);
          }
        },
        [bangleStore, updateRecency, items],
      );

      useImperativeHandle(
        ref,
        () => ({
          onExecuteItem,
        }),
        [onExecuteItem],
      );

      return (
        <>
          <UniversalPalette.PaletteItemsContainer>
            {items.map((item) => {
              return (
                <UniversalPalette.PaletteItemUI
                  key={item.uid}
                  item={item}
                  onClick={onSelect}
                  isActive={item === activeItem}
                />
              );
            })}
          </UniversalPalette.PaletteItemsContainer>
          <UniversalPalette.PaletteInfo>
            <UniversalPalette.PaletteInfoItem>
              use:
            </UniversalPalette.PaletteInfoItem>
            <UniversalPalette.PaletteInfoItem>
              <kbd className="font-normal">↑↓</kbd> Navigate
            </UniversalPalette.PaletteInfoItem>
            <UniversalPalette.PaletteInfoItem>
              <kbd className="font-normal">Enter</kbd> Open a workspace
            </UniversalPalette.PaletteInfoItem>
            <UniversalPalette.PaletteInfoItem>
              <kbd className="font-normal">{keyDisplayValue('Mod')}-Enter</kbd>{' '}
              Open a in new tab
            </UniversalPalette.PaletteInfoItem>
          </UniversalPalette.PaletteInfo>
        </>
      );
    },
  );

function strMatch(a: string[] | string, b: string): boolean {
  b = b.toLocaleLowerCase().trim();

  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();

  return a.includes(b) || b.includes(a);
}

export const workspacePalette: ExtensionPaletteType = {
  type: CorePalette.Workspace,
  icon: <AlbumIcon />,
  identifierPrefix,
  placeholder: 'Select a workspace to open',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(3);
    }

    return null;
  },
  ReactComponent: WorkspacePaletteUIComponent,
};
