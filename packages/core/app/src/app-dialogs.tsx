import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  AppAlertDialog,
  DialogSingleInput,
  DialogSingleSelect,
  WorkspaceDialogRoot,
} from '@bangle.io/ui-components';
import { useAtom } from 'jotai';
import React from 'react';

export function AppDialogs() {
  const coreServices = useCoreServices();
  const [openWsDialog, setOpenWsDialog] = useAtom(
    coreServices.workbenchState.$openWsDialog,
  );
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
      <WorkspaceDialogRoot
        open={openWsDialog}
        onOpenChange={setOpenWsDialog}
        onDone={({ wsName }) => {
          setOpenWsDialog(false);
          coreServices.workspaceOps.createWorkspaceInfo({
            metadata: {},
            name: wsName,
            type: WORKSPACE_STORAGE_TYPE.Browser,
          });
        }}
      />

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
      />
    </>
  );
}
