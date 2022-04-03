import React from 'react';

import { supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import { Item, Select } from '@bangle.io/ui-components';

import { BROWSER, FILE_SYSTEM, WorkspaceStorageType } from './common';

export function StorageTypeDropdown({
  storageType,
  updateStorageType,
}: {
  updateStorageType: (storageType: WorkspaceStorageType) => void;
  storageType: WorkspaceStorageType;
}) {
  return (
    <Select
      aria-label="Select storage type"
      selectedKey={storageType}
      size="large"
      onSelectionChange={(r) => {
        updateStorageType(r.toString() as WorkspaceStorageType);
      }}
      disabledKeys={supportsNativeBrowserFs() ? undefined : ['file-system']}
    >
      <Item key={FILE_SYSTEM} textValue="File System">
        File System{' '}
        {!supportsNativeBrowserFs() && '(Only on Chromium browsers)'}
      </Item>
      <Item key={BROWSER} textValue="Browser">
        Browser
        {supportsNativeBrowserFs() && ' (Not recommended)'}
      </Item>
    </Select>
  );
}
