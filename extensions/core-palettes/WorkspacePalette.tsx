import { keyDisplayValue } from 'config';
import { ExtensionPaletteType } from 'extension-registry';
import React, { useCallback, useImperativeHandle, useMemo } from 'react';
import { AlbumIcon, CloseIcon, UniversalPalette } from 'ui-components';
import { useWorkspaces } from 'workspaces';
import { extensionName } from './config';
import { useRecencyWatcher } from './hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

const identifierPrefix = 'ws:';

const storageKey = 'WorkspacePaletteUIComponent/1';

const WorkspacePaletteUIComponent: ExtensionPaletteType['ReactComponent'] =
  React.forwardRef(
    ({ query, dismissPalette, onSelect, getActivePaletteItem }, ref) => {
      const { workspaces, switchWorkspace, deleteWorkspace } = useWorkspaces();
      const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);

      const items = useMemo(() => {
        const _items = injectRecency(
          workspaces
            .filter((ws) => {
              return strMatch(ws.name, query);
            })
            .map((workspace, i) => {
              return {
                uid: `${workspace.name}-(${workspace.type})`,
                title: workspace.name,
                extraInfo: workspace.type,
                data: { workspace },
                rightHoverNode: (
                  <CloseIcon
                    style={{
                      height: 16,
                      width: 16,
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Are you sure you want to remove "${workspace.name}"? Removing a workspace does not delete any files inside it.`,
                        )
                      ) {
                        await deleteWorkspace(workspace.name);
                        dismissPalette();
                      }
                    }}
                  />
                ),
              };
            }),
        );

        return _items;
      }, [query, workspaces, dismissPalette, deleteWorkspace, injectRecency]);

      const activeItem = getActivePaletteItem(items);

      const onExecuteItem = useCallback(
        (getUid, sourceInfo) => {
          const uid = getUid(items);
          const item = items.find((item) => item.uid === uid);
          if (item) {
            switchWorkspace(item.data.workspace.name, sourceInfo.metaKey);
            updateRecency(uid);
          }
        },
        [switchWorkspace, updateRecency, items],
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

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

export const workspacePalette: ExtensionPaletteType = {
  type: extensionName + '/workspace',
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
