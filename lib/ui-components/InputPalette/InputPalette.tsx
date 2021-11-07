import PropTypes from 'prop-types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { sleep, useDestroyRef } from '@bangle.io/utils';

import { NullIcon, SpinnerIcon } from '../Icons';
import { UniversalPalette } from '../UniversalPalette';

InputPalette.propTypes = {
  placeholder: PropTypes.string,
  initialValue: PropTypes.string,
  onDismiss: PropTypes.func.isRequired,
  onExecute: PropTypes.func.isRequired,
  updateError: PropTypes.func.isRequired,
  error: PropTypes.object,
  children: PropTypes.element,
  widescreen: PropTypes.bool.isRequired,
  selectOnMount: PropTypes.bool,
};

export function InputPalette({
  placeholder,
  initialValue = '',
  onDismiss,
  // you are expected to never throw error in the onExecute
  onExecute,
  updateError,
  error,
  children,
  selectOnMount,
  widescreen,
  className = '',
}) {
  const destroyedRef = useDestroyRef();
  const [showSpinner, updateSpinner] = useState(false);
  const [inputValue, _onInputValueChange] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () =>
      [
        {
          uid: 'input-confirm',
          title: 'Confirm',
          isDisabled: Boolean(showSpinner || error),
        },
        {
          uid: 'input-cancel',
          title: 'Cancel',
          isDisabled: Boolean(showSpinner),
        },
      ].filter(Boolean),
    [error, showSpinner],
  );

  const errorItem = error && {
    uid: 'error',
    title: '🤦‍♀️ Error',
    description: error.displayMessage || error.message,
  };

  useEffect(() => {
    updateError?.(undefined);
    updateSpinner(false);
  }, [inputValue, updateError]);

  useEffect(() => {
    updateSpinner(false);
  }, [error]);

  useEffect(() => {
    if (error) {
      inputRef.current?.focus();
    }
  }, [error]);

  const onExecuteItem = useCallback(
    async (getUid) => {
      const uid = getUid(items);

      let resolved = false;
      if (uid === 'input-confirm' && !error) {
        sleep(250).then(() => {
          if (!resolved) {
            if (!destroyedRef.current) {
              updateSpinner(true);
            }
          }
        });
        try {
          await onExecute(inputValue);
        } finally {
          resolved = true;
        }
      } else if (uid === 'input-cancel') {
        onDismiss();
      }
      resolved = true;
    },
    [inputValue, onDismiss, items, error, onExecute, destroyedRef],
  );

  const { inputProps, resetCounter, onSelect, counter } =
    UniversalPalette.usePaletteDriver(onDismiss, onExecuteItem);

  const onInputValueChange = (value) => {
    _onInputValueChange(value);
    resetCounter();
  };

  const activeItem =
    items[UniversalPalette.getActiveIndex(counter, items.length)];

  return (
    <UniversalPalette.PaletteContainer
      onClickOutside={() => {
        onDismiss();
      }}
      onClickInside={() => {
        inputRef.current?.focus();
      }}
      widescreen={widescreen}
      className={'input-palette ' + className}
    >
      <UniversalPalette.PaletteInput
        leftNode={showSpinner ? <SpinnerIcon /> : <NullIcon />}
        placeholder={placeholder}
        inputValue={inputValue}
        onInputValueChange={onInputValueChange}
        ref={inputRef}
        selectOnMount={selectOnMount}
        {...inputProps}
      />
      <UniversalPalette.PaletteItemsContainer>
        {items.map((item, i) => (
          <UniversalPalette.PaletteItemUI
            key={item.uid}
            item={item}
            onClick={onSelect}
            isActive={item === activeItem}
          />
        ))}
        {errorItem && (
          <UniversalPalette.PaletteItemUI
            item={errorItem}
            isActive={false}
            onClick={() => {}}
            style={{
              backgroundColor: 'var(--error-bgColor)',
            }}
          />
        )}
      </UniversalPalette.PaletteItemsContainer>
      {children}
    </UniversalPalette.PaletteContainer>
  );
}
