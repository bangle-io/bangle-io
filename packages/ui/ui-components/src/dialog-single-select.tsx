import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  emptyActionText?: string;
  onEmptyAction?: () => void;
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
  id,
  hasAnyIcon,
  isActive,
  onSelect,
}: {
  option: DialogSingleSelectProps['options'][0];
  id: string;
  hasAnyIcon: boolean;
  isActive: boolean;
  onSelect: (option: { id: string; title?: string }) => void;
}) {
  const OptionIcon = option.icon;
  return (
    <Button
      id={id}
      type="button"
      role="option"
      aria-selected={isActive || option.active}
      variant="ghost"
      className={cn(
        'h-auto w-full justify-start px-2 py-2 text-left font-normal',
        isActive && 'bg-accent text-accent-foreground',
      )}
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
  emptyActionText,
  onEmptyAction,
  initialSearch = '',
  Icon,
  hints,
}: DialogSingleSelectProps) {
  const [search, setSearch] = React.useState(initialSearch);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();
  const title = badgeText || groupHeading || placeholder;
  const description = placeholder;

  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.select());
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      (option.title || option.id).toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, options]);

  const hasAnyIcon = options.some((option) => option.icon);
  const activeOption = filteredOptions[activeIndex];
  const activeOptionId = activeOption
    ? `${listboxId}-option-${activeIndex}`
    : undefined;

  React.useEffect(() => {
    setActiveIndex((current) =>
      filteredOptions.length === 0
        ? 0
        : Math.min(current, filteredOptions.length - 1),
    );
  }, [filteredOptions.length]);

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
            if (activeOption) {
              selectOption(activeOption);
            } else if (onEmptyAction) {
              runEmptyAction();
            }
          }}
        >
          <Input
            ref={inputRef}
            aria-label={placeholder}
            aria-activedescendant={activeOptionId}
            aria-controls={listboxId}
            aria-expanded={open}
            role="combobox"
            placeholder={placeholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((current) =>
                  filteredOptions.length === 0
                    ? 0
                    : Math.min(current + 1, filteredOptions.length - 1),
                );
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
            }}
          />

          <div className="grid gap-2">
            {groupHeading && (
              <div className="px-1 font-medium text-muted-foreground text-xs">
                {groupHeading}
              </div>
            )}
            <div
              id={listboxId}
              role="listbox"
              aria-label={groupHeading || title}
              className="max-h-72 overflow-y-auto rounded-md border p-1"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <SingleSelectItem
                    key={option.id}
                    id={`${listboxId}-option-${index}`}
                    option={option}
                    hasAnyIcon={hasAnyIcon}
                    isActive={index === activeIndex}
                    onSelect={selectOption}
                  />
                ))
              ) : (
                <div className="grid gap-3 px-3 py-6 text-center">
                  <div className="text-muted-foreground text-sm">
                    {emptyMessage}
                  </div>
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
              )}
            </div>
          </div>

          <DialogHints hints={hints} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t.app.common.cancelButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
