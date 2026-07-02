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
import React from 'react';

export type DialogSingleInputProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  option: {
    id: string;
    title?: string;
  };
  onSelect: (input: string) => void;
  placeholder?: string;
  groupHeading?: string;
  Icon?: React.ElementType;
  badgeTone?: 'destructive' | 'default';
  badgeText?: string;
  initialSearch?: string;
  hints?: string[];
};

export function DialogSingleInput({
  open,
  setOpen,
  option,
  onSelect,
  groupHeading = '',
  placeholder = t.app.dialogs.singleInput.placeholderDefault,
  badgeText,
  badgeTone = 'default',
  Icon,
  initialSearch = '',
  hints,
}: DialogSingleInputProps) {
  const [search, setSearch] = React.useState(initialSearch);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const title = badgeText || option.title || option.id;
  const description = hints?.join(' ') || placeholder;
  const submitText = option.title || t.app.common.continueButton;

  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    window.requestAnimationFrame(() => inputRef.current?.select());
  }, [open]);

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
            if (!search.trim()) {
              return;
            }

            onSelect(search);
            setOpen(false);
          }}
        >
          {groupHeading && (
            <div className="font-medium text-muted-foreground text-xs">
              {groupHeading}
            </div>
          )}

          <Input
            ref={inputRef}
            aria-label={placeholder}
            placeholder={placeholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t.app.common.cancelButton}
            </Button>
            <Button type="submit" disabled={!search.trim()}>
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
