import React, { useRef } from 'react';

import { cx, useKeybindings, useWatchClickOutside } from '@bangle.io/utils';

import { ButtonIcon } from '../ButtonIcon';
import { ErrorBoundary } from '../ErrorBoundary';
import { CloseIcon } from '../Icons';

export function Modal({
  children,
  onDismiss,
  containerClassName = '',
  className = '',
  title = '',
  style = {},
}: {
  children: JSX.Element;
  onDismiss: () => void;
  containerClassName?: string;
  title?: string;
  className?: string;
  style?: any;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWatchClickOutside(containerRef, onDismiss, () => {});

  useKeybindings(() => {
    return {
      Escape: () => {
        onDismiss();
        return true;
      },
    };
  }, [onDismiss]);

  return (
    <div
      className={cx('fixed z-50 inset-0 overflow-y-auto', containerClassName)}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed w-full h-full transition-opacity ui-components_modal-overlay"
          aria-hidden="true"
        ></div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div
          ref={containerRef}
          style={style}
          className={cx(
            'ui-components_modal-container ui-components_modal-fadeInScaleAnimation  inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full',
            className,
          )}
        >
          <div className="w-full px-6 my-2 select-none ">
            <div className="flex flex-row justify-between pt-2 pb-2 text-3xl border-b-2 ui-components_modal-header ">
              <span>{title}</span>
              <ButtonIcon onClick={onDismiss} removeFocus={true}>
                <CloseIcon className="w-6 h-6 rounded-sm hover:bangle-io_accentSecondary" />
              </ButtonIcon>
            </div>
          </div>

          <div className="">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
