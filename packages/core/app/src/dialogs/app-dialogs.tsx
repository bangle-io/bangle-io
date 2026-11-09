import { useCoreServices } from '@bangle.io/context';
import {
  AppAlertDialog,
  DialogSingleInput,
  DialogSingleSelect,
} from '@bangle.io/ui-components';
import { useAtom } from 'jotai';
import React from 'react';
import { AllFilesDialog } from './all-files-dialog';
import { CreateWorkspaceDialog } from './create-workspace-dialog';
import { StaleTabDialog } from './stale-tab-dialog';

export function AppDialogs() {
  const coreServices = useCoreServices();

  const [singleSelectDialog, setSingleSelectDialog] = useAtom(
    coreServices.workbenchState.$singleSelectDialog,
  );
  const [singleInputDialog, setSingleInputDialog] = useAtom(
    coreServices.workbenchState.$singleInputDialog,
  );
  const [alertDialog, setAlertDialog] = useAtom(
    coreServices.workbenchState.$alertDialog,
  );

  return (
    <>
      <StaleTabDialog />
      <AllFilesDialog />
      <CreateWorkspaceDialog />
      <AppAlertDialog
        key={alertDialog?.dialogId}
        open={Boolean(alertDialog)}
        setOpen={(open) => {
          setAlertDialog(open && alertDialog ? alertDialog : undefined);
        }}
        title={alertDialog?.title || ''}
        description={alertDialog?.description || ''}
        cancelText={alertDialog?.cancelText}
        continueText={alertDialog?.continueText}
        onCancel={alertDialog?.onCancel || (() => {})}
        onContinue={alertDialog?.onContinue || (() => {})}
        tone={alertDialog?.tone}
        dialogId={alertDialog?.dialogId}
      />

      <DialogSingleInput
        key={singleInputDialog?.dialogId}
        open={Boolean(singleInputDialog)}
        setOpen={(open) => {
          setSingleInputDialog(
            open && singleInputDialog ? singleInputDialog : undefined,
          );
        }}
        onSelect={singleInputDialog?.onSelect || (() => {})}
        title={singleInputDialog?.title}
        description={singleInputDialog?.description}
        inputLabel={singleInputDialog?.inputLabel}
        submitText={singleInputDialog?.submitText}
        placeholder={singleInputDialog?.placeholder}
        Icon={singleInputDialog?.Icon}
        initialSearch={singleInputDialog?.initialSearch}
      />

      <DialogSingleSelect
        key={singleSelectDialog?.dialogId}
        open={Boolean(singleSelectDialog)}
        setOpen={(open) => {
          setSingleSelectDialog(
            open && singleSelectDialog ? singleSelectDialog : undefined,
          );
        }}
        options={singleSelectDialog?.options || []}
        onSelect={singleSelectDialog?.onSelect || (() => {})}
        title={singleSelectDialog?.title}
        description={singleSelectDialog?.description}
        searchPlaceholder={singleSelectDialog?.searchPlaceholder}
        tone={singleSelectDialog?.tone}
        groupLabel={singleSelectDialog?.groupLabel}
        emptyMessage={singleSelectDialog?.emptyMessage}
        emptyActionText={singleSelectDialog?.emptyActionText}
        onEmptyAction={singleSelectDialog?.onEmptyAction}
        Icon={singleSelectDialog?.Icon}
        initialSearch={singleSelectDialog?.initialSearch}
        hints={singleSelectDialog?.hints}
      />
    </>
  );
}
