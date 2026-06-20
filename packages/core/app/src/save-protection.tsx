import { useCoreServices } from '@bangle.io/context';
import React, { useEffect } from 'react';

type SaveStatusSource = {
  hasPendingOrFailedSave: () => boolean;
  subscribeToSaveStatus: (listener: () => void) => () => void;
};

type UnsavedChangesTarget = {
  setUnsavedChanges: (hasUnsavedChanges: boolean) => void;
};

export function connectSaveProtection(
  saveStatus: SaveStatusSource,
  navigation: UnsavedChangesTarget,
): () => void {
  const syncProtection = () => {
    navigation.setUnsavedChanges(saveStatus.hasPendingOrFailedSave());
  };

  syncProtection();
  const unsubscribe = saveStatus.subscribeToSaveStatus(syncProtection);

  return () => {
    unsubscribe();
    navigation.setUnsavedChanges(false);
  };
}

export function SaveProtection() {
  const { navigation, pmEditorService } = useCoreServices();

  useEffect(
    () => connectSaveProtection(pmEditorService, navigation),
    [navigation, pmEditorService],
  );

  return null;
}
