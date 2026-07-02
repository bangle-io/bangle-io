import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
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

function DialogHints({ hints }: { hints?: string[] }) {
  if (!hints?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 border-border border-t pt-3">
      {hints.map((hint) => (
        <span key={hint} className="text-muted-foreground text-xs">
          {hint}
        </span>
      ))}
    </div>
  );
}

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
    <Button
      type="button"
      role="option"
      aria-selected={option.active ? true : undefined}
      variant="ghost"
      className="h-auto w-full justify-start px-2 py-2 text-left font-normal"
      onClick={() => onSelect(option)}
    >
      {hasAnyIcon && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {OptionIcon ? (
            <OptionIcon className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">
        {option.title || option.id}
      </span>
      {option.active && (
        <Check className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
      )}
    </Button>
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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const title = badgeText || groupHeading || placeholder;
  const description = placeholder;

  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    window.requestAnimationFrame(() => inputRef.current?.select());
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      (option.title || option.id).toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, options]);

  const hasAnyIcon = options.some((option) => option.icon);

  const selectOption = React.useCallback(
    (option: { id: string; title?: string }) => {
      onSelect(option);
      setOpen(false);
    },
    [onSelect, setOpen],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={cn(
              'flex items-center gap-2',
              badgeTone === 'destructive' && 'text-destructive',
            )}
          >
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const [firstOption] = filteredOptions;
            if (firstOption) {
              selectOption(firstOption);
            }
          }}
        >
          <Input
            ref={inputRef}
            aria-label={placeholder}
            placeholder={placeholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="grid gap-2">
            {groupHeading && (
              <div className="px-1 font-medium text-muted-foreground text-xs">
                {groupHeading}
              </div>
            )}
            <div
              role="listbox"
              aria-label={groupHeading || title}
              className="max-h-72 overflow-y-auto rounded-md border p-1"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <SingleSelectItem
                    key={option.id}
                    option={option}
                    hasAnyIcon={hasAnyIcon}
                    onSelect={selectOption}
                  />
                ))
              ) : (
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>

          <DialogHints hints={hints} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
