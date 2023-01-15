import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import {
  OverlayContainer,
  useModal,
  useOverlay,
  usePreventScroll,
} from '@react-aria/overlays';
import React, { useCallback } from 'react';

import { cx } from '@bangle.io/utils';

import { Button } from '../Button';
import { LoadingCircleIcon } from '../Icons';
import { Inline } from '../Inline';

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
  size = 'md',
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
  size?: 'sm' | 'md' | 'lg' | 'full';
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

  return (
    <OverlayContainer
      portalContainer={
        // since getElementById returns null, fallback to undefined
        // for tests
        document.getElementById('dialog-container') || undefined
      }
    >
      <div
        className="fixed flex justify-center z-modal backdrop-blur-sm items-start widescreen:items-center inset-0 transition-opacity"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        {...underlayProps}
      >
        <FocusScope contain restoreFocus autoFocus>
          <div
            className={cx(
              'B-ui-components_dialog-content-container bg-colorNeutralBgLayerTop rounded-lg shadow-xl',
              size === 'sm' && 'BU_small',
              size === 'md' && 'BU_medium',
              size === 'lg' && 'BU_large',
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

            <Inline
              justify={null}
              reverseRow
              className="B-ui-components_dialog-button-group pt-12 smallscreen:pt-4 flex-row-reverse"
            >
              {primaryButtonConfig && (
                <Button
                  tone={
                    primaryButtonConfig.isDestructive ? 'critical' : 'neutral'
                  }
                  isDisabled={isLoading || primaryButtonConfig.disabled}
                  ariaLabel={primaryButtonConfig.text}
                  onPress={() => {
                    primaryButtonConfig.onPress();
                  }}
                  text={primaryButtonConfig.text}
                />
              )}
              {isDismissable && (
                <Button
                  tone="secondary"
                  ariaLabel={'dismiss'}
                  isDisabled={isLoading}
                  onPress={_onDismiss}
                  text={dismissText}
                  focus={{
                    autoFocus: primaryButtonConfig?.isDestructive,
                  }}
                />
              )}
            </Inline>
            <footer className="B-ui-components_dialog-footer">{footer}</footer>
          </div>
        </FocusScope>
      </div>
    </OverlayContainer>
  );
}
