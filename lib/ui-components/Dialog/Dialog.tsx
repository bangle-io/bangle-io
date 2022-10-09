import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import {
  OverlayContainer,
  useModal,
  useOverlay,
  usePreventScroll,
} from '@react-aria/overlays';
import { useViewportSize } from '@react-aria/utils';
import React, { useCallback, useEffect } from 'react';

import { cx, usePrevious } from '@bangle.io/utils';

import { Button } from '../Button/Button';
import { LoadingCircleIcon } from '../Icons';
import type { SizeType } from '../misc';

export type CTAConfig = {
  isDestructive?: boolean;
  text: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Dialog({
  children,
  dismissText = 'Close',
  headingTitle,
  headingIcon = null,
  footer = null,
  heroImageUrl,
  isDismissable = false,
  isKeyboardDismissDisabled = !isDismissable,
  // if true prevents dismissing the dialog and shows
  // loading state to user.
  isLoading = false,
  onDismiss,
  primaryButtonConfig,
  size = 'medium',
  allowScroll = false,
}: {
  children: React.ReactNode;
  headingIcon?: React.ReactNode;
  dismissText?: string;
  footer?: React.ReactNode;
  headingTitle: string;
  heroImageUrl?: string;
  isDismissable: boolean;
  isKeyboardDismissDisabled?: boolean;
  isLoading?: boolean;
  onDismiss: () => void;
  primaryButtonConfig?: CTAConfig;
  size?: SizeType;
  allowScroll?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const _onDismiss = useCallback(() => {
    if (!isLoading) {
      onDismiss();
    }
  }, [isLoading, onDismiss]);

  const { overlayProps, underlayProps } = useOverlay(
    {
      isOpen: true,
      onClose: _onDismiss,
      isDismissable,
      isKeyboardDismissDisabled,
    },
    ref,
  );

  const { modalProps } = useModal();
  const { dialogProps, titleProps } = useDialog({ role: 'alertdialog' }, ref);

  usePreventScroll();

  let viewport = useViewportSize();

  let prevHeight = usePrevious(viewport.height);

  // This hook exists to deal with iOS issues where the dialog
  // input can get hidden by the keyboard.

  useEffect(() => {
    const diff = prevHeight && viewport.height - prevHeight;

    // Once the keyboard is dismissed, the dialog will be scrolled to
    // be at top.
    if (diff && diff > 100) {
      if (ref.current) {
        ref.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // there keyboard was shown, scroll into the element that is in focus.
    if (diff && diff < -100) {
      let active = document.activeElement;
      let container = ref.current;

      if (container && active && container.contains(active)) {
        active.scrollIntoView();
      }
    }
  }, [viewport.height, prevHeight]);

  return (
    <OverlayContainer
      portalContainer={
        // since getElementById returns null, fallback to undefined
        // for tests
        document.getElementById('dialog-container') || undefined
      }
    >
      <div
        className="B-ui-components_dialog-underlay transition-opacity"
        {...underlayProps}
      >
        <FocusScope contain restoreFocus autoFocus>
          <div
            className={cx(
              'B-ui-components_dialog-content-container',
              size === 'small' && 'BU_small',
              size === 'medium' && 'BU_medium',
              size === 'large' && 'BU_large',
              size === 'full' && 'w-full',
            )}
            {...overlayProps}
            {...dialogProps}
            {...modalProps}
            ref={ref}
          >
            {heroImageUrl && (
              <div className="B-ui-components_dialog-hero">
                <img src={heroImageUrl} alt="hero" />
              </div>
            )}
            <div className="B-ui-components_dialog-header-icon w-6 h-6">
              {isLoading ? (
                <div
                  role="progressbar"
                  className="inline-block"
                  aria-label="Loading..."
                >
                  <LoadingCircleIcon className="w-6 h-6" />
                </div>
              ) : (
                headingIcon
              )}
            </div>
            <h2
              className="B-ui-components_dialog-heading text-xl font-semibold break-all"
              {...titleProps}
            >
              {headingTitle}
            </h2>
            <hr className="B-ui-components_dialog-divider" />
            <div
              className={cx(
                'B-ui-components_dialog-content',
                allowScroll && 'overflow-y-auto',
              )}
            >
              {typeof children === 'string' ? <p>{children}</p> : children}
            </div>

            <div className="B-ui-components_dialog-button-group flex flex-row-reverse justify-start pt-12 pl-6">
              {primaryButtonConfig && (
                <Button
                  className="ml-3"
                  variant={
                    primaryButtonConfig.isDestructive
                      ? 'destructive'
                      : 'primary'
                  }
                  isDisabled={isLoading || primaryButtonConfig.disabled}
                  ariaLabel={primaryButtonConfig.text}
                  onPress={() => {
                    primaryButtonConfig.onPress();
                  }}
                >
                  {primaryButtonConfig.text}
                </Button>
              )}
              {isDismissable && (
                <Button
                  variant="secondary"
                  ariaLabel={'dismiss'}
                  isDisabled={isLoading}
                  onPress={_onDismiss}
                  autoFocus={primaryButtonConfig?.isDestructive}
                >
                  {dismissText}
                </Button>
              )}
            </div>
            <footer className="B-ui-components_dialog-footer">{footer}</footer>
          </div>
        </FocusScope>
      </div>
    </OverlayContainer>
  );
}
