import React, { useRef, useMemo } from 'react';
import { useWorkspaces } from 'workspace/index';
import { PaletteTypeBase, WORKSPACE_PALETTE } from '../paletteTypes';
import {
  AlbumIcon,
  CloseIcon,
  PaletteInfo,
  PaletteInfoItem,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  usePaletteProps,
} from 'ui-components/index';
import { keybindings, keyDisplayValue } from 'config/index';
import { addBoldToTitle } from '../utils';
import { useKeybindings } from 'utils/hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export class WorkspacePalette extends PaletteTypeBase {
  static type = WORKSPACE_PALETTE;
  static identifierPrefix = 'ws:';
  static description = 'Switch workspace';
  static UIComponent = WorkspacePaletteUIComponent;
  static placeholder = 'Enter a workspace name';
  static keybinding = keybindings.toggleWorkspacePalette.key;
  static parseRawQuery(rawQuery) {
    if (this.identifierPrefix && rawQuery.startsWith(this.identifierPrefix)) {
      return rawQuery.slice(3);
    }
    return null;
  }
}

const ActivePalette = WorkspacePalette;

function WorkspacePaletteUIComponent({
  query,
  dismissPalette,
  updateRawInputValue,
  rawInputValue,
}) {
  const { workspaces, switchWorkspace, deleteWorkspace } = useWorkspaces();

  const resolvedItems = useMemo(() => {
    const onExecute = ({ data }, itemIndex, event) => {
      if (event.metaKey) {
        switchWorkspace(data.workspace.name, true);
        dismissPalette();
      } else {
        switchWorkspace(data.workspace.name);
        dismissPalette();
      }
    };

    return workspaces
      .filter((ws) => {
        return strMatch(ws.name, query);
      })
      .map((workspace, i) => {
        return {
          uid: `${workspace.name}-(${workspace.type})`,
          onExecute,
          title: addBoldToTitle(`${workspace.name} (${workspace.type})`, query),
          data: { workspace },
          rightHoverIcon: (
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
      });
  }, [query, dismissPalette, deleteWorkspace, switchWorkspace, workspaces]);

  const updateCounterRef = useRef();
  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: updateRawInputValue,
    updateCounterRef,
  });

  useKeybindings(() => {
    return {
      [ActivePalette.keybinding]: () => {
        updateCounterRef.current?.((counter) => counter + 1);
      },
    };
  }, []);

  return (
    <>
      <PaletteInput
        placeholder={ActivePalette.placeholder}
        ref={useRef()}
        paletteIcon={
          <span className="pr-2 flex items-center">
            <AlbumIcon className="h-5 w-5" />
          </span>
        }
        {...inputProps}
      />
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              disabled={item.disabled}
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
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
