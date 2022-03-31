import React from 'react';

import { supportsNativeBrowserFs } from '@bangle.io/baby-fs';
import {
  ButtonContent,
  DropdownMenu,
  MenuItem,
  MenuSection,
} from '@bangle.io/ui-bangle-button';
import { ChevronDownIcon } from '@bangle.io/ui-components';

import {
  BROWSER,
  FILE_SYSTEM,
  getStorageDescription,
  WorkspaceStorageType,
} from './common';

export function StorageTypeDropdown({
  storageType,
  updateStorageType,
  updateIsDropdownOpen,
}: {
  updateIsDropdownOpen: (state: boolean) => void;
  updateStorageType: (storageType: WorkspaceStorageType) => void;
  storageType: WorkspaceStorageType;
}) {
  return (
    <DropdownMenu
      // Only focus dropdown if fs is not supported
      // otherwise the focus in on browse
      buttonAutoFocus={!supportsNativeBrowserFs()}
      menuPlacement="auto-end"
      ariaLabel="storage type dropdown"
      buttonAriaLabel="select storage type"
      buttonStyling={{
        activeColor: 'test-active-color',
      }}
      disabledKeys={supportsNativeBrowserFs() ? undefined : ['file-system']}
      buttonClassName="test-button-class "
      buttonChildren={
        <ButtonContent
          text={getStorageDescription(storageType)}
          size="small"
          icon={<ChevronDownIcon />}
          iconPos="right"
        />
      }
      onAction={(key) => {
        let _key = key.toString();

        if (BROWSER === _key || FILE_SYSTEM === _key) {
          updateStorageType(_key);
        } else {
          throw new Error('Unknown storage type');
        }
      }}
      onSelectedChange={(isSelected) => {
        updateIsDropdownOpen(isSelected);
      }}
      style={{
        // because this is a modal need more contrast
        backgroundColor: 'var(--BV-window-dropdown-bg-color-1)',
      }}
    >
      <MenuSection aria-label="misc-test">
        <MenuItem aria-label="file system storage type" key="file-system">
          File System{' '}
          {!supportsNativeBrowserFs() && '(Only on Chromium browsers)'}
        </MenuItem>
        <MenuItem aria-label="browser storage type" key="browser">
          Browser
          {supportsNativeBrowserFs() && ' (Not recommended)'}
        </MenuItem>
      </MenuSection>
    </DropdownMenu>
  );
}
