import React, { useCallback, useImperativeHandle, useMemo } from 'react';
import { useWorkspaces } from 'workspaces';
import {
  AlbumIcon,
  CloseIcon,
  PaletteInfo,
  PaletteInfoItem,
} from 'ui-components/index';
import { extensionName } from './config';
import {
  MagicPaletteItem,
  MagicPaletteItemsContainer,
} from 'magic-palette/index';
import { keybindings, keyDisplayValue } from 'config/index';
import { useRecencyWatcher } from './hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

const identifierPrefix = 'ws:';
export const workspacePalette = {
  type: extensionName + '/workspace',
  icon: (
    <span className="pr-2 flex items-center">
      <AlbumIcon className="h-5 w-5" />
    </span>
  ),
  identifierPrefix,
  placeholder: 'Select a workspace to open',
  keybinding: keybindings.toggleWorkspacePalette.key,
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(3);
    }
    return null;
  },
  ReactComponent: React.forwardRef(WorkspacePaletteUIComponent),
};
const storageKey = 'WorkspacePaletteUIComponent/1';
function WorkspacePaletteUIComponent(
  { query, dismissPalette, paletteItemProps },
  ref,
) {
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
          };
        }),
    );

    return _items;
  }, [query, workspaces, injectRecency]);

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
      <MagicPaletteItemsContainer>
        {items.map((item) => {
          return (
            <MagicPaletteItem
              key={item.uid}
              items={items}
              title={item.title}
              extraInfo={item.extraInfo}
              showDividerAbove={item.showDividerAbove}
              uid={item.uid}
              isDisabled={item.disabled}
              rightIcons={item.rightIcons}
              {...paletteItemProps}
              rightHoverIcons={
                <CloseIcon
                  style={{
                    height: 16,
                    width: 16,
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Are you sure you want to remove "${item.data.workspace.name}"? Removing a workspace does not delete any files inside it.`,
                      )
                    ) {
                      await deleteWorkspace(item.data.workspace.name);
                      dismissPalette();
                    }
                  }}
                />
              }
            />
          );
        })}
      </MagicPaletteItemsContainer>
      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Open a workspace
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">{keyDisplayValue('Mod')}-Enter</kbd> Open
          a in new tab
        </PaletteInfoItem>
      </PaletteInfo>
    </>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}
