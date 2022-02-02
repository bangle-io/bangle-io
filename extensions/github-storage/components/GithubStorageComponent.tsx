import React, { useEffect, useRef } from 'react';

import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import { InputPalette, UniversalPalette } from '@bangle.io/ui-components';

import { RepoPicker } from './RepoPicker';

export function GithubStorageComponent() {
  const [showPicker, updateShowPicker] = React.useState(false);

  useSerialOperationHandler((sOperation) => {
    if (
      sOperation.name === 'operation::@bangle.io/github-storage:new-workspace'
    ) {
      updateShowPicker(true);
      return true;
    }
    return false;
  }, []);

  return showPicker ? (
    <TokenInput
      onDismiss={() => {
        updateShowPicker(false);
      }}
    />
  ) : null;
}

function TokenInput({ onDismiss }: { onDismiss: () => void }) {
  const [token, updateToken] = React.useState(() => {
    return localStorage.getItem('github_token') || '';
  });
  let lastToken = useRef<string | undefined>();
  const [error, updateError] = React.useState<Error | undefined>();

  useEffect(() => {
    if (token && token !== lastToken.current) {
      console.log('saving token', token, typeof token);
      localStorage.setItem('github_token', token);
      lastToken.current = token;
    }
    if (token === '') {
      localStorage.removeItem('github_token');
    }
  }, [token]);
  useEffect(() => {
    let destroyed = false;
    if (!token) {
      requestAnimationFrame(() => {
        if (!destroyed) {
          document
            .querySelector<HTMLInputElement>(
              '.universal-palette-container input',
            )
            ?.focus();
        }
      });
    }
    return () => {
      destroyed = true;
    };
  }, [token]);

  if (!token) {
    return (
      <InputPalette
        placeholder="Enter your Github token"
        onExecute={(inputValue) => {
          updateToken(inputValue);
        }}
        onDismiss={onDismiss}
        updateError={updateError}
        error={error}
        initialValue={token || undefined}
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

  return (
    <RepoPicker
      githubToken={token}
      onDismiss={(clear) => {
        if (clear) {
          localStorage.removeItem('github_token');
        }
        onDismiss();
      }}
    />
  );
}
