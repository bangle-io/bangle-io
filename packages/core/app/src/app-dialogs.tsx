import { useCoreServices } from '@bangle.io/context';
import {
  AppAlertDialog,
  DialogSingleInput,
  DialogSingleSelect,
} from '@bangle.io/ui-components';
import { useAtom } from 'jotai';
import React from 'react';
import { AllFilesDialog } from './components/all-files-dialog';
import { CreateWorkspaceDialog } from './components/create-workspace-dialog';

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
        placeholder={singleInputDialog?.placeholder}
        badgeText={singleInputDialog?.badgeText}
        badgeTone={singleInputDialog?.badgeTone}
        groupHeading={singleInputDialog?.groupHeading}
        Icon={singleInputDialog?.Icon}
        option={singleInputDialog?.option || { id: '' }}
        initialSearch={singleInputDialog?.initialSearch}
        hints={singleInputDialog?.hints}
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
        placeholder={singleSelectDialog?.placeholder}
        badgeText={singleSelectDialog?.badgeText}
        badgeTone={singleSelectDialog?.badgeTone}
        groupHeading={singleSelectDialog?.groupHeading}
        emptyMessage={singleSelectDialog?.emptyMessage}
        Icon={singleSelectDialog?.Icon}
        initialSearch={singleSelectDialog?.initialSearch}
        hints={singleSelectDialog?.hints}
      />
    </>
  );
}
