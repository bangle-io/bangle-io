import { INPUT_PALETTE } from '../paletteTypes';

export function useInputPalette({ metadata, updatePalette }) {
  return ({ query, paletteType }) => {
    if (paletteType !== INPUT_PALETTE) {
      return null;
    }

    return [
      {
        uid: 'input-confirm',
        title: 'Confirm',
        onExecute: () => {
          return Promise.resolve(metadata.onInputConfirm(query))
            .then(() => {
              return true;
            })
            .catch((err) => {
              console.error(err);
            });
        },
      },
      {
        uid: 'input-cancel',
        title: 'Cancel',
        onExecute: () => {
          return Promise.resolve(metadata.onInputCancel?.(query))
            .then(() => {
              return true;
            })
            .catch((err) => {
              console.error(err);
              return true;
            });
        },
      },
    ];
  };
}
