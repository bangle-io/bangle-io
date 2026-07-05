import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@bangle.io/base-ui';
import { Button } from '@bangle.io/shadcn';
import React from 'react';

export type DialogSingleInputProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSelect: (input: string) => void;
  title?: string;
  description?: string;
  inputLabel?: string;
  submitText?: string;
  placeholder?: string;
  Icon?: React.ElementType;
  initialSearch?: string;
};

export function DialogSingleInput({
  open,
  setOpen,
  onSelect,
  placeholder = t.app.dialogs.singleInput.placeholderDefault,
  title,
  description,
  inputLabel = placeholder,
  submitText = t.app.common.continueButton,
  Icon,
  initialSearch = '',
}: DialogSingleInputProps) {
  const [search, setSearch] = React.useState(initialSearch);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const dialogTitle = title || inputLabel;
  const dialogDescription = description || placeholder;

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
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
            <span>{dialogTitle}</span>
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
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
          <div className="grid gap-2">
            <Label htmlFor={inputId}>{inputLabel}</Label>
            <Input
              id={inputId}
              ref={inputRef}
              placeholder={placeholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

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
