import React, { useRef } from 'react';
import { cx, useKeybindings, useWatchClickOutside } from 'utils';
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
  onDismiss: Function;
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
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 b-modal-overlay-color bg-opacity-75 transition-opacity"
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
            'fadeInScaleAnimation inline-block align-bottom b-bg-stronger-color rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full',
            className,
          )}
        >
          <div className="px-6 w-full my-2 select-none ">
            <div className="border-b-2 b-border-bottom-color b-bg-stronger-color pt-2 pb-2 text-3xl flex flex-row justify-between">
              <span>{title}</span>
              <ButtonIcon onClick={onDismiss} removeFocus={true}>
                <CloseIcon className="h-6 w-6 hover:b-accent-2-color rounded-sm" />
              </ButtonIcon>
            </div>
          </div>

          <div className="b-bg-stronger-color">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
