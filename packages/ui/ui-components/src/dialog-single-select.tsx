import {
  Button,
  CommandBadge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
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
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  groupLabel?: string;
  tone?: 'destructive' | 'default';
  emptyMessage?: React.ReactNode;
  emptyActionText?: string;
  onEmptyAction?: () => void;
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
    <CommandItem onSelect={() => onSelect(option)}>
      {hasAnyIcon && (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
          {OptionIcon ? (
            <OptionIcon className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </div>
      )}
      <span className="min-w-0 flex-1 truncate">
        {option.title || option.id}
      </span>
      {option.active && (
        <Check className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
      )}
    </CommandItem>
  );
}

export function DialogSingleSelect({
  open,
  setOpen,
  options,
  onSelect,
  title,
  description,
  searchPlaceholder = t.app.dialogs.singleSelect.placeholderDefault,
  groupLabel = '',
  tone = 'default',
  emptyMessage = t.app.dialogs.singleSelect.emptyMessageDefault,
  emptyActionText,
  onEmptyAction,
  initialSearch = '',
  Icon,
  hints,
}: DialogSingleSelectProps) {
  const [search, setSearch] = React.useState(initialSearch);
  const hasAnyIcon = options.some((option) => option.icon);
  const dialogTitle = title || groupLabel || searchPlaceholder;
  const dialogDescription = description || searchPlaceholder;

  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const selectOption = React.useCallback(
    (option: { id: string; title?: string }) => {
      onSelect(option);
      setOpen(false);
    },
    [onSelect, setOpen],
  );

  const runEmptyAction = React.useCallback(() => {
    onEmptyAction?.();
    setOpen(false);
  }, [onEmptyAction, setOpen]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      screenReaderTitle={dialogTitle}
    >
      <CommandBadge className={cn(tone === 'destructive' && 'bg-destructive')}>
        <span
          className={cn(
            tone === 'destructive' && 'text-destructive-foreground',
          )}
        >
          {dialogTitle}
        </span>
      </CommandBadge>
      <div className="mx-4 mt-1 text-muted-foreground text-sm">
        {dialogDescription}
      </div>
      <CommandInput
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        value={search}
        onValueChange={setSearch}
        Icon={Icon}
      />
      <CommandList>
        <CommandGroup heading={groupLabel}>
          {options.map((option) => (
            <SingleSelectItem
              key={option.id}
              option={option}
              hasAnyIcon={hasAnyIcon}
              onSelect={selectOption}
            />
          ))}
        </CommandGroup>
        <CommandEmpty>
          <div className="grid gap-3 px-3 py-6 text-center">
            <div className="text-muted-foreground text-sm">{emptyMessage}</div>
            {emptyActionText && onEmptyAction && (
              <Button
                type="button"
                variant="outline"
                className="justify-self-center"
                onClick={runEmptyAction}
              >
                {emptyActionText}
              </Button>
            )}
          </div>
        </CommandEmpty>
      </CommandList>
      <CommandHints hints={hints} />
      <div className="flex justify-end border-border border-t p-3">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          {t.app.common.cancelButton}
        </Button>
      </div>
    </CommandDialog>
  );
}
