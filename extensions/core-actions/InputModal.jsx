import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { sleep } from 'utils/utility';

import { UniversalPalette, NullIcon, SpinnerIcon } from 'ui-components';
import { useDestroyRef } from 'utils/index';

export function InputModal({
  placeholder,
  initialValue = '',
  dismissModal,
  // you are expected to never throw error in the onExecute
  onExecute,
  updateError,
  error,
  children,
  selectOnMount,
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
          disabled: showSpinner || error,
        },
        { uid: 'input-cancel', title: 'Cancel', disabled: showSpinner },
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
        dismissModal();
      }
      resolved = true;
    },
    [inputValue, dismissModal, items, error, onExecute, destroyedRef],
  );

  const { inputProps, resetCounter, paletteItemProps } =
    UniversalPalette.usePaletteDriver(dismissModal, onExecuteItem);

  const onInputValueChange = (value) => {
    _onInputValueChange(value);
    resetCounter();
  };

  return (
    <UniversalPalette.MagicPaletteContainer
      onClickOutside={() => {
        dismissModal();
      }}
      onClickInside={() => {
        inputRef.current?.focus();
      }}
      widescreen={false}
    >
      <UniversalPalette.MagicInputPalette
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
      <UniversalPalette.MagicPaletteItemsContainer>
        {items.map((item, i) => (
          <UniversalPalette.MagicPaletteItem
            uid={item.uid}
            items={items}
            title={item.title}
            extraInfo={item.extraInfo}
            description={item.description}
            key={item.uid}
            isDisabled={item.disabled}
            {...paletteItemProps}
          />
        ))}
        {errorItem && (
          <UniversalPalette.MagicPaletteItemUI
            uid={errorItem.uid}
            title={errorItem.title}
            description={errorItem.description}
            style={{
              backgroundColor: 'var(--error-bg-color)',
            }}
          />
        )}
      </UniversalPalette.MagicPaletteItemsContainer>
      {children}
    </UniversalPalette.MagicPaletteContainer>
  );
}
