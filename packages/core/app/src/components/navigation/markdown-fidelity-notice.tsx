import { useCoreServices } from '@bangle.io/context';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import { Info } from 'lucide-react';
import React from 'react';

interface MarkdownFidelityNoticeProps {
  wsPath: string;
}

/**
 * A quiet info affordance shown next to the note name when the open note's
 * stored Markdown does not survive the editor's parse/serialize round trip.
 * Clicking it opens a calm explanation that editing may reformat those parts
 * without losing any content.
 *
 * The active engine reports which notes are affected through
 * `$roundTripWarnings` (`EditorEngineContract`); an engine that always
 * preserves Markdown lists none, so this renders nothing.
 */
export function MarkdownFidelityNotice({
  wsPath,
}: MarkdownFidelityNoticeProps) {
  const { editorEngine } = useCoreServices();
  const roundTripWarnings = useAtomValue(editorEngine.$roundTripWarnings);

  if (!roundTripWarnings.has(wsPath)) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            title={t.app.editor.fidelityNotice.label}
            data-testid="markdown-fidelity-notice"
          >
            <Info size={16} />
            <span className="sr-only">{t.app.editor.fidelityNotice.label}</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.app.editor.fidelityNotice.title}</DialogTitle>
          <DialogDescription>
            {t.app.editor.fidelityNotice.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
