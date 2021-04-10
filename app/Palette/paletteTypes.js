import {
  AlbumIcon,
  FileDocumentIcon,
  NullIcon,
  TerminalIcon,
} from 'ui-components/index';
import { keybindings } from 'config/index';

export const FILE_PALETTE = 'file';
export const COMMAND_PALETTE = 'command';
export const WORKSPACE_PALETTE = 'workspace';
export const INPUT_PALETTE = 'input';
export const QUESTION_PALETTE = 'question';

export const palettes = {
  [FILE_PALETTE]: {
    type: FILE_PALETTE,
    Icon: FileDocumentIcon,
    keybinding: keybindings.toggleFilePalette.key,
    inputPlaceholder: `Enter a file name or type '?' to see other palettes.`,
  },
  [COMMAND_PALETTE]: {
    type: COMMAND_PALETTE,
    Icon: TerminalIcon,
    keybinding: keybindings.toggleCommandPalette.key,
    inputPlaceholder: null,
  },
  [WORKSPACE_PALETTE]: {
    type: WORKSPACE_PALETTE,
    Icon: AlbumIcon,
    keybinding: keybindings.toggleWorkspacePalette.key,
    inputPlaceholder: null,
  },
  [INPUT_PALETTE]: {
    type: INPUT_PALETTE,
    Icon: NullIcon,
    keybinding: null,
    inputPlaceholder: null,
  },
  [QUESTION_PALETTE]: {
    type: QUESTION_PALETTE,
    Icon: NullIcon,
    keybinding: null,
    inputPlaceholder: null,
  },
};
