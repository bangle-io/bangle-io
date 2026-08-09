import type { EditorEngineContract, EditorSavePhase } from '@bangle.io/context';
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

export const EDITOR_SAVING_DELAY_MS = 400;

type SaveStatusSource = Pick<
  EditorEngineContract,
  'engineId' | 'getSaveStatus' | 'retryFailedSave' | 'subscribeToSaveStatus'
>;

function useEditorSavePhase(
  source: SaveStatusSource,
  wsPath: string,
): EditorSavePhase {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      source.subscribeToSaveStatus(onStoreChange, wsPath),
    [source, wsPath],
  );
  const getSnapshot = useCallback(
    () => source.getSaveStatus(wsPath),
    [source, wsPath],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Truthful, exact-path save state for the writable editor. A raw `clean`
 * snapshot is deliberately silent: it only becomes `Saved` after this mount
 * has observed save activity for the same path.
 */
export function EditorSaveStatus({
  source,
  wsPath,
}: {
  source: SaveStatusSource;
  wsPath: string;
}) {
  // The current Wordgard surface is intentionally read-only. Keeping this
  // narrow switch here avoids implying that it has a durable save pipeline.
  if (source.engineId !== 'prosemirror') {
    return null;
  }

  return <WritableEditorSaveStatus source={source} wsPath={wsPath} />;
}

function WritableEditorSaveStatus({
  source,
  wsPath,
}: {
  source: SaveStatusSource;
  wsPath: string;
}) {
  const phase = useEditorSavePhase(source, wsPath);
  const [observedActivity, setObservedActivity] = useState<{
    active: boolean;
    wsPath: string;
  }>({ active: false, wsPath });
  const [savingVisibility, setSavingVisibility] = useState<{
    visible: boolean;
    wsPath: string;
  }>({ visible: false, wsPath });
  const hasObservedActivity =
    observedActivity.wsPath === wsPath && observedActivity.active;
  const showSaving =
    savingVisibility.wsPath === wsPath && savingVisibility.visible;

  useEffect(() => {
    if (phase === 'clean') {
      return;
    }
    setObservedActivity({ active: true, wsPath });
  }, [phase, wsPath]);

  useEffect(() => {
    setSavingVisibility({ visible: false, wsPath });
    if (phase !== 'pending') {
      return;
    }

    const timer = window.setTimeout(() => {
      setSavingVisibility({ visible: true, wsPath });
    }, EDITOR_SAVING_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, wsPath]);

  let content: React.ReactNode = null;
  if (phase === 'failed') {
    content = (
      <button
        className="rounded-sm px-1.5 py-1 font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          source.retryFailedSave(wsPath);
        }}
        type="button"
      >
        {t.app.editor.saveStatus.retry}
      </button>
    );
  } else if (phase === 'pending') {
    content = showSaving ? t.app.editor.saveStatus.saving : null;
  } else if (hasObservedActivity) {
    content = t.app.editor.saveStatus.saved;
  }

  return (
    <div
      className="flex w-20 shrink-0 items-center justify-end text-muted-foreground text-xs"
      data-testid="editor-save-status"
      role="status"
    >
      {content}
    </div>
  );
}
