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

import { ButtonV2 } from '../ButtonV2/ButtonV2';
import { LoadingCircleIcon } from '../Icons';
import { Inline } from '../Inline';
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

            <Inline
              justify={null}
              reverseRow
              className="B-ui-components_dialog-button-group pt-12 smallscreen:pt-4 flex-row-reverse"
            >
              {primaryButtonConfig && (
                <ButtonV2
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
                <ButtonV2
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
