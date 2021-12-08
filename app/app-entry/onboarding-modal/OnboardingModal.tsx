import React, { useCallback } from 'react';

import { BangleIcon, Modal } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';

export function OnboardingModal() {
  const { modal, dispatch } = useUIManagerContext();
  const showModal = modal === '@modal/onboarding';

  const onDismiss = useCallback(() => {
    dispatch({
      type: 'UI/DISMISS_MODAL',
    });
  }, [dispatch]);

  return showModal ? (
    <Modal onDismiss={onDismiss} containerClassName="">
      <div className="p-8 flex flex-col justify-center items-center">
        <BangleIcon className="w-32 h-32 app-entry_onboarding-modal-logo" />
        <h1 className="text-3xl my-8 font-bold">Welcome to Bangle.io</h1>
        <h2 className="text-xl font-normal">Note taking for the next decade</h2>
      </div>
    </Modal>
  ) : null;
}
