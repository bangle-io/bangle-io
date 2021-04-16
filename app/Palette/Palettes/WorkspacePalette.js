import React, { useCallback } from 'react';
import { useWorkspaces } from 'workspace/index';
import { PaletteTypeBase, WORKSPACE_PALETTE } from '../paletteTypes';
import { AlbumIcon, CloseIcon, PaletteUI } from 'ui-components/index';
import { keybindings } from 'config/index';
import { addBoldToTitle } from '../utils';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export class WorkspacePalette extends PaletteTypeBase {
  static type = WORKSPACE_PALETTE;
  static identifierPrefix = 'ws:';
  static description = 'Switch workspace';
  static PaletteIcon = AlbumIcon;
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

function WorkspacePaletteUIComponent({ dismissPalette, query, paletteProps }) {
  const { workspaces, switchWorkspace, deleteWorkspace } = useWorkspaces();
  const onExecute = useCallback(
    ({ data }, itemIndex, event) => {
      if (event.metaKey) {
        switchWorkspace(data.workspace.name, true);
        dismissPalette();
      } else {
        switchWorkspace(data.workspace.name);
        dismissPalette();
      }
    },
    [switchWorkspace, dismissPalette],
  );

  const getResolvedItems = ({ query }) => {
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
  };
  return <PaletteUI items={getResolvedItems({ query })} {...paletteProps} />;
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase().trim();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase().trim();
  return a.includes(b) || b.includes(a);
}
