import { useStore } from '@nalanda/react';
import { ToastContainer, ToastQueue } from '@react-spectrum/toast';
import React, { useEffect } from 'react';

import { getToastEmitter } from '@bangle.io/slice-ui';

import { logger } from '../logger';

export function ToastArea() {
  const store = useStore();

  const pendingIds = React.useRef(new Map<string, () => void>());

  useEffect(() => {
    const toastEmitter = getToastEmitter(store);

    const reqUnsub = toastEmitter.on(
      'toast-request',
      ({ label, type, id, timeout }) => {
        const dismiss = ToastQueue[type](label, {
          timeout,
          onClose: () => {
            if (id) {
              pendingIds.current.delete(id);
            }
          },
        });

        if (!id) {
          return;
        }

        if (pendingIds.current.has(id)) {
          logger.warn(
            `Duplicate toast id detected, ignoring toast with id: ${id}`,
          );
          return;
        }

        pendingIds.current.set(id, dismiss);
      },
    );

    const clearUnsub = toastEmitter.on('toast-clear', ({ id }) => {
      const dismiss = pendingIds.current.get(id);
      if (dismiss) {
        pendingIds.current.delete(id);
        dismiss();
      }
    });

    const clearAllUnsub = toastEmitter.on('toast-clear-all', () => {
      pendingIds.current.forEach((dismiss) => {
        dismiss();
      });
      pendingIds.current.clear();
    });

    return () => {
      reqUnsub();
      clearUnsub();
      clearAllUnsub();
    };
  }, [store]);

  useEffect(() => {
    pendingIds.current.forEach((dismiss) => {
      dismiss();
    });
    pendingIds.current.clear();
  }, []);

  return <ToastContainer />;
}
