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
        onPressEnter: () => {
          Promise.resolve(metadata.onInputConfirm(query))
            .then(() => {
              updatePalette({ type: null });
            })
            .catch((err) => {
              console.error(err);
              updatePalette({ type: null });
            });
        },
      },
      {
        uid: 'input-cancel',
        title: 'Cancel',
        onPressEnter: () => {
          Promise.resolve(metadata.onInputCancel?.(query))
            .then(() => {
              updatePalette({ type: null });
            })
            .catch((err) => {
              console.error(err);
              updatePalette({ type: null });
            });
        },
      },
    ];
  };
}
