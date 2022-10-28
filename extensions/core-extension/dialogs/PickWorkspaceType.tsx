import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import type { ListBoxOptionComponentType } from '@bangle.io/ui-components';
import {
  CheckIcon,
  Dialog,
  ExternalLink,
  Item,
  ListBox,
  mergeProps,
  useFocusRing,
  useListState,
  useOption,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { defaultStorage, disabledStorageType } from './common';

export function PickWorkspaceType({
  onDismiss,
  onSelect,
  hasGithub,
  hasPrivateFs,
}: {
  onSelect: (type: WorkspaceType) => void;
  onDismiss: () => void;
  hasGithub?: boolean;
  hasPrivateFs: boolean;
}) {
  const [selectedKey, updateSelectedKey] =
    React.useState<WorkspaceType>(defaultStorage);

  const state = useListState({
    children: [
      <Item
        aria-label="local file storage"
        key={WorkspaceType.NativeFS}
        textValue="local file storage"
      >
        <div>
          <div>
            <span className="font-bold">Local File Storage</span>
            {disabledStorageType.includes(WorkspaceType.NativeFS) ? (
              <span> (Not available)</span>
            ) : (
              <span> (Recommended)</span>
            )}
          </div>
          <div>
            <span className="text-sm text-justify">
              This option allows you to save notes directly to a folder of your
              choice. We recommend it as it provides complete data ownership to
              our users.
            </span>
          </div>
        </div>
      </Item>,

      hasGithub ? (
        <Item key={WorkspaceType.Github} textValue="github storage">
          <div>
            <div>
              <span className="font-bold">GitHub Storage</span>
            </div>
            <div>
              <span className="text-sm text-justify">
                Allows you to sync your notes with a GitHub repository of your
                choice. It will keep your notes synced across multiple devices.
              </span>
            </div>
          </div>
        </Item>
      ) : null,

      <Item
        key={hasPrivateFs ? WorkspaceType.PrivateFS : WorkspaceType.Browser}
        textValue="browser storage"
      >
        <div>
          <div>
            <span className="font-bold">Browser Storage</span>
          </div>
          <div>
            <span className="text-sm text-justify">
              Stores notes in your browser's storage. A good option if you want
              to try out Bangle. However, you can lose your notes if you clear
              your browser storage.
            </span>
          </div>
        </div>
      </Item>,
    ].filter((r): r is React.ReactElement => Boolean(r)),
    selectionMode: 'single',
    disabledKeys: disabledStorageType,
    selectedKeys: [selectedKey],

    onSelectionChange(keys) {
      // keys cannot be all since single
      if (typeof keys !== 'string') {
        const key = [...keys][0];

        if (key) {
          updateSelectedKey(key as WorkspaceType);
        }
      }
    },
  });

  return (
    <Dialog
      footer={
        <ExternalLink
          text="Your data stays with you"
          href="https://bangle.io/privacy"
        />
      }
      isDismissable
      headingTitle="Choose a storage type"
      onDismiss={onDismiss}
      size="medium"
      primaryButtonConfig={{
        text: 'Next',
        onPress: () => {
          onSelect(selectedKey);
        },
      }}
    >
      <ListBox
        label="Choose a storage type"
        state={state}
        optionComponent={Option}
        className="B-core-extension_pick-workspace-storage"
      />
    </Dialog>
  );
}

const Option: ListBoxOptionComponentType = ({ item, state }) => {
  // Get props for the option element
  let ref = React.useRef<HTMLLIElement>(null);

  let { optionProps, isSelected, isDisabled, isFocused } = useOption(
    { key: item.key },
    state,
    ref,
  );

  // Determine whether we should show a keyboard
  // focus ring for accessibility
  let { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      className={cx(
        'flex flex-row items-center',
        isFocusVisible && 'B-ui-components_misc-button-ring',
        'outline-none rounded-sm cursor-pointer my-2',
        isDisabled && 'opacity-50 cursor-not-allowed',
        isSelected && 'BU_is-active',
        isFocused && 'BU_is-focused',
      )}
      style={{
        borderRadius: 'var(--BV-ui-bangle-button-radius)',
      }}
    >
      <div className="px-3 py-2">{item.rendered}</div>
      <div className="px-3">
        {isSelected ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <div className="w-4 h-4"></div>
        )}
      </div>
    </li>
  );
};
