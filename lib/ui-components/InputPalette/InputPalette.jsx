import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { sleep } from 'utils/utility';
import { useDestroyRef } from 'utils/index';
import { UniversalPalette } from '../UniversalPalette/index';
import { NullIcon, SpinnerIcon } from '../Icons';
import PropTypes from 'prop-types';

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
  const [showSpinner, updateSpinner] = useState();
  const [inputValue, _onInputValueChange] = useState(initialValue);
  const inputRef = useRef();

  const items = useMemo(
    () =>
      [
        {
          uid: 'input-confirm',
          title: 'Confirm',
          disabled: Boolean(showSpinner || error),
        },
        {
          uid: 'input-cancel',
          title: 'Cancel',
          disabled: Boolean(showSpinner),
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
    updateSpinner(undefined);
  }, [inputValue, updateError]);

  useEffect(() => {
    updateSpinner(undefined);
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
        leftIcon={
          showSpinner ? (
            <SpinnerIcon className="h-5 w-5" />
          ) : (
            <NullIcon className="h-5 w-5" />
          )
        }
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
            onSelect={onSelect}
            isActive={item === activeItem}
          />
        ))}
        {errorItem && (
          <UniversalPalette.PaletteItemUI
            item={errorItem}
            isActive={false}
            onSelect={() => {}}
            style={{
              backgroundColor: 'var(--error-bg-color)',
            }}
          />
        )}
      </UniversalPalette.PaletteItemsContainer>
      {children}
    </UniversalPalette.PaletteContainer>
  );
}
