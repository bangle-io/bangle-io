import {
  COMMAND_PALETTE,
  FILE_PALETTE,
  QUESTION_PALETTE,
  WORKSPACE_PALETTE,
} from '../paletteTypes';

export function useQuestionPalette({ updatePalette }) {
  return ({ query, paletteType }) => {
    if (paletteType !== QUESTION_PALETTE) {
      return null;
    }

    return [
      {
        uid: 'file-question-palette',
        title: '… Open file or heading',
        onExecute: () => {
          updatePalette({ type: FILE_PALETTE });
          return false;
        },
      },
      {
        uid: 'command-question-palette',
        title: '> Run a command',
        onExecute: () => {
          updatePalette({ type: COMMAND_PALETTE });
          return false;
        },
      },
      {
        uid: 'switch-workspace-question-palette',
        title: 'ws: Switch workspace',
        onExecute: () => {
          updatePalette({ type: WORKSPACE_PALETTE });
          return false;
        },
      },
      {
        uid: 'heading-question-palette',
        title: '# Jump to a heading',
        onExecute: () => {
          updatePalette({ type: WORKSPACE_PALETTE });
          return false;
        },
      },
    ];
  };
}
