import { useCoreServices } from '@bangle.io/context';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import React from 'react';

export function ManualBugReportDialog() {
  const { errorReporting } = useCoreServices();
  const report = useAtomValue(errorReporting.$manualReportPrompt);
  const sending = useAtomValue(errorReporting.$sendingReports);

  if (!report) {
    return null;
  }

  const keepForLater = () => {
    errorReporting.dismissManualReportPrompt(report.id);
  };

  const deleteReport = async () => {
    try {
      await errorReporting.deletePendingReport(report.id);
    } catch {
      toast.error(t.app.bugReportPrompt.reportDeleteFailed);
    }
  };

  const sendReport = async () => {
    try {
      if (await errorReporting.sendPendingReport(report.id)) {
        toast.success(t.app.bugReportPrompt.reportSent);
      } else {
        toast.error(t.app.bugReportPrompt.reportSendFailed);
      }
    } catch {
      toast.error(t.app.bugReportPrompt.reportSendFailed);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          keepForLater();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.app.bugReportPrompt.title}</DialogTitle>
          <DialogDescription>
            {t.app.bugReportPrompt.description}
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {t.app.bugReportPrompt.reassurance}
        </p>

        <div className="min-w-0">
          <h3 className="mb-2 font-medium text-sm">
            {t.app.bugReportPrompt.previewLabel}
          </h3>
          <pre
            className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs"
            data-testid="manual-bug-report-preview"
          >
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            disabled={sending}
            onClick={() => void deleteReport()}
            type="button"
            variant="ghost"
          >
            {t.app.bugReportPrompt.deleteReport}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              disabled={sending}
              onClick={keepForLater}
              type="button"
              variant="outline"
            >
              {t.app.bugReportPrompt.keepForLater}
            </Button>
            <Button
              disabled={sending}
              onClick={() => void sendReport()}
              type="button"
            >
              {sending
                ? t.app.bugReportPrompt.sendingReport
                : t.app.bugReportPrompt.sendReport}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
