import { cx } from '@bangle.io/base-utils';
import {
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
} from '@bangle.io/shadcn';
import { Check } from 'lucide-react';
import React from 'react';

export type DialogSingleSelectProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  options: {
    id: string;
    title?: string;
    active?: boolean;
    icon?: React.ElementType;
  }[];
  onSelect: (option: { id: string; title?: string }) => void;
  placeholder?: string;
  groupHeading?: string;
  badgeTone?: 'destructive' | 'default';
  badgeText?: string;
  emptyMessage?: React.ReactNode;
  Icon?: React.ElementType;
  initialSearch?: string;
  hints?: string[];
};

function SingleSelectItem({
  option,
  hasAnyIcon,
  onSelect,
}: {
  option: DialogSingleSelectProps['options'][0];
  hasAnyIcon: boolean;
  onSelect: (option: { id: string; title?: string }) => void;
}) {
  const OptionIcon = option.icon;
  return (
    <CommandItem
      key={option.id}
      onSelect={() => {
        onSelect(option);
      }}
    >
      {hasAnyIcon && (
        <div className="mr-1 flex h-4 w-4 items-center">
          {OptionIcon ? (
            <OptionIcon className="h-4 w-4" />
          ) : hasAnyIcon ? (
            <div className="h-4 w-4" />
          ) : null}
        </div>
      )}
      <span>{option.title || option.id}</span>
      {option.active && <Check className="h-4 w-4 shrink-0 opacity-50" />}
    </CommandItem>
  );
}

export function DialogSingleSelect({
  open,
  setOpen,
  options,
  onSelect,
  placeholder = t.app.dialogs.singleSelect.placeholderDefault,
  groupHeading = '',
  badgeText,
  badgeTone = 'default',
  emptyMessage = t.app.dialogs.singleSelect.emptyMessageDefault,
  initialSearch = '',
  Icon,
  hints,
}: DialogSingleSelectProps) {
  const [search, setSearch] = React.useState(initialSearch);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      (option.title || option.id).toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, options]);

  const hasAnyIcon = options.some((option) => option.icon);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      screenReaderTitle="dialog select"
    >
      {badgeText && (
        <CommandBadge
          className={cx(badgeTone === 'destructive' && 'bg-destructive')}
        >
          <span
            className={cx(
              badgeTone === 'destructive' && 'text-destructive-foreground',
            )}
          >
            {badgeText}
          </span>
        </CommandBadge>
      )}
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={(val) => {
          setSearch(val);
        }}
        Icon={Icon}
      />
      <CommandList>
        <CommandGroup heading={groupHeading}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <SingleSelectItem
                key={option.id}
                option={option}
                hasAnyIcon={hasAnyIcon}
                onSelect={(opt) => {
                  onSelect(opt);
                  setOpen(false);
                }}
              />
            ))
          ) : (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          )}
        </CommandGroup>
      </CommandList>
      <CommandHints hints={hints} />
    </CommandDialog>
  );
}
