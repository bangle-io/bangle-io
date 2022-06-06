import { CheckIcon } from '@heroicons/react/solid';
import type { AriaListBoxOptions } from '@react-aria/listbox';
import { useListBox, useListBoxSection, useOption } from '@react-aria/listbox';
import { useSeparator } from '@react-aria/separator';
import type { ListState } from '@react-stately/list';
import type { Node } from '@react-types/shared';
import * as React from 'react';

import { cx } from '@bangle.io/utils';

interface ListBoxProps extends AriaListBoxOptions<unknown> {
  listBoxRef?: React.RefObject<HTMLUListElement>;
  state: ListState<unknown>;
}

interface SectionProps {
  section: Node<unknown>;
  state: ListState<unknown>;
}

interface OptionProps {
  item: Node<unknown>;
  state: ListState<unknown>;
}

export function ListBox(props: ListBoxProps) {
  let ref = React.useRef<HTMLUListElement>(null);
  let { listBoxRef = ref, state } = props;
  let { listBoxProps } = useListBox(props, state, listBoxRef);

  return (
    <ul
      {...listBoxProps}
      ref={listBoxRef}
      className="max-h-72 overflow-auto outline-none"
    >
      {[...state.collection].map((item) =>
        item.type === 'section' ? (
          <ListBoxSection key={item.key} section={item} state={state} />
        ) : (
          <Option key={item.key} item={item} state={state} />
        ),
      )}
    </ul>
  );
}

function ListBoxSection({ section, state }: SectionProps) {
  let { itemProps, headingProps, groupProps } = useListBoxSection({
    'heading': section.rendered,
    'aria-label': section['aria-label'],
  });

  let { separatorProps } = useSeparator({
    elementType: 'li',
  });

  return (
    <>
      {section.key !== state.collection.getFirstKey() && (
        <li
          {...separatorProps}
          className="mx-1 my-2"
          style={{
            borderTop: '1px solid var(--BV-window-border-color-0)',
          }}
        />
      )}
      <li {...itemProps} className="pt-2">
        {section.rendered && (
          <span
            {...headingProps}
            className="text-xs font-bold uppercase mx-3 select-none"
            style={{
              color: 'var(--BV-text-color-1)',
            }}
          >
            {section.rendered}
          </span>
        )}
        <ul {...groupProps}>
          {[...section.childNodes].map((node) => (
            <Option key={node.key} item={node} state={state} />
          ))}
        </ul>
      </li>
    </>
  );
}

function Option({ item, state }: OptionProps) {
  let ref = React.useRef<HTMLLIElement>(null);
  let { optionProps, isDisabled, isSelected, isFocused } = useOption(
    {
      key: item.key,
    },
    state,
    ref,
  );

  return (
    <li
      {...optionProps}
      ref={ref}
      className={cx(
        `m-1 py-2 px-2 text-sm outline-none flex items-center justify-between  select-none`,
        isDisabled && 'opacity-50 cursor-not-allowed',
      )}
      style={{
        color: 'var(--BV-window-dropdown-color)',
        borderRadius: 'var(--BV-ui-bangle-button-radius)',
        backgroundColor: isSelected
          ? 'var(--BV-accent-primary-0)'
          : isFocused
          ? 'var(--BV-accent-secondary)'
          : 'inherit',
      }}
    >
      {item.rendered}
      {isSelected && <CheckIcon aria-hidden="true" className="w-4 h-4" />}
    </li>
  );
}
