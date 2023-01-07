import { CheckIcon } from '@heroicons/react/solid';
import type { AriaListBoxOptions } from '@react-aria/listbox';
import { useListBox, useListBoxSection, useOption } from '@react-aria/listbox';
import { useSeparator } from '@react-aria/separator';
import type { ListState } from '@react-stately/list';
import type { Node } from '@react-types/shared';
import * as React from 'react';

import { cx } from '@bangle.io/utils';

export type ListBoxOptionComponentType = typeof ListBoxOptionComponent;

interface ListBoxProps extends AriaListBoxOptions<unknown> {
  listBoxRef?: React.RefObject<HTMLUListElement>;
  state: ListState<unknown>;
  optionComponent?: ListBoxOptionComponentType;
  className?: string;
}

interface SectionProps {
  section: Node<unknown>;
  state: ListState<unknown>;
  optionComponent: ListBoxOptionComponentType;
}

interface OptionProps {
  item: Node<unknown>;
  state: ListState<unknown>;
}

export function ListBox(props: ListBoxProps) {
  let ref = React.useRef<HTMLUListElement>(null);
  let { listBoxRef = ref, state } = props;
  let { listBoxProps } = useListBox(props, state, listBoxRef);

  let OptionComponent = props.optionComponent || ListBoxOptionComponent;

  return (
    <ul
      {...listBoxProps}
      ref={listBoxRef}
      className={cx(`outline-none`, props.className)}
    >
      {[...state.collection].map((item) =>
        item.type === 'section' ? (
          <ListBoxSection
            optionComponent={OptionComponent}
            key={item.key}
            section={item}
            state={state}
          />
        ) : (
          <OptionComponent key={item.key} item={item} state={state} />
        ),
      )}
    </ul>
  );
}

function ListBoxSection({
  section,
  state,
  optionComponent: OptionComponent,
}: SectionProps) {
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
          className="mx-1 my-2 border-t-1 border-colorNeutralBorder border-solid"
        />
      )}
      <li {...itemProps} className="pt-2">
        {section.rendered && (
          <span
            {...headingProps}
            className="text-xs font-bold uppercase mx-3 select-none text-colorNeutralTextSubdued"
          >
            {section.rendered}
          </span>
        )}
        <ul {...groupProps}>
          {[...section.childNodes].map((node) => (
            <OptionComponent key={node.key} item={node} state={state} />
          ))}
        </ul>
      </li>
    </>
  );
}

export function ListBoxOptionComponent({ item, state }: OptionProps) {
  let ref = React.useRef<HTMLLIElement>(null);
  let { optionProps, isDisabled, isSelected, isFocused } = useOption(
    {
      key: item.key,
    },
    state,
    ref,
  );

  return (
    <li {...optionProps} ref={ref} className="outline-none">
      <div
        className={cx(
          `my-1 py-2 px-2 text-sm outline-none flex items-center justify-between select-none rounded`,
          isDisabled && 'text-colorNeutralTextDisabled cursor-not-allowed',
          isSelected
            ? 'bg-colorPromoteSolid'
            : isFocused
            ? 'bg-colorNeutralSolidFaint'
            : '',
        )}
      >
        {item.rendered}
        {isSelected && <CheckIcon aria-hidden="true" className="w-4 h-4" />}
      </div>
    </li>
  );
}
