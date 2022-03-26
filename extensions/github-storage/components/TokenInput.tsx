import React from 'react';

import { InputPalette, UniversalPalette } from '@bangle.io/ui-components';

export function TokenInput({
  onDismiss,
  updateToken,
}: {
  onDismiss: (clear?: boolean) => void;
  updateToken: (token: string) => void;
}) {
  const [error, updateError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    let destroyed = false;
    requestAnimationFrame(() => {
      if (!destroyed) {
        document
          .querySelector<HTMLInputElement>(
            '.b-ui-components_universal-palette-container input',
          )
          ?.focus();
      }
    });

    return () => {
      destroyed = true;
    };
  }, []);

  return (
    <InputPalette
      placeholder="Please enter a Github token"
      onExecute={(inputValue) => {
        updateToken(inputValue);
      }}
      onDismiss={onDismiss}
      updateError={updateError}
      error={error}
      initialValue={undefined}
      selectOnMount={true}
      widescreen={false}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are currently providing Github token
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </InputPalette>
  );
}
