import { cx } from '@bangle.io/base-utils';
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@bangle.io/ui-components';
import { Check, CircleAlert, Copy, ExternalLink, Unlink } from 'lucide-react';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { normalizeLinkTarget } from '../link-target';
import type { PmEditorService } from '../pm-editor-service';
import {
  FLOATING_INITIAL_STYLE,
  type UseFloatingPositionProps,
  useFloatingPosition,
} from './use-floating-position';
import { useOutsidePointer } from './use-outside-pointer';

type EditorView = NonNullable<ReturnType<PmEditorService['getEditor']>>;
type Extensions = PmEditorService['extensions'];

/**
 * Normalizes a user-entered web address or relative Markdown file path.
 */
export function normalizeHttpUrl(urlString: string): string | undefined {
  return normalizeLinkTarget(urlString)?.href;
}

export function isValidHttpUrl(urlString: string): boolean {
  return Boolean(normalizeHttpUrl(urlString));
}

type LinkEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onRemove?: () => void;
  onCopy?: (value: string) => void | Promise<void>;
  onOpen?: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

type CopyFeedback = 'failure' | 'idle' | 'success';

/** A controlled, draft-only link input. */
export function LinkEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  onRemove,
  onCopy,
  onOpen,
  inputRef,
}: LinkEditorProps) {
  const errorId = useId();
  const [invalid, setInvalid] = useState(
    () => Boolean(value.trim()) && !normalizeHttpUrl(value),
  );
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>('idle');
  const copyFeedbackTimerRef = useRef<number | undefined>(undefined);
  const copyRequestRef = useRef(0);
  const mountedRef = useRef(false);
  const normalizedValue = normalizeHttpUrl(value);
  const valid = Boolean(normalizedValue);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      copyRequestRef.current += 1;
      if (copyFeedbackTimerRef.current !== undefined) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const submit = () => {
    if (!normalizedValue) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit(normalizedValue);
  };

  const preserveSelection = (event: React.PointerEvent) => {
    event.preventDefault();
  };

  const copy = async () => {
    if (!normalizedValue || !onCopy) {
      return;
    }

    if (copyFeedbackTimerRef.current !== undefined) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    setCopyFeedback('idle');
    const request = ++copyRequestRef.current;

    try {
      await onCopy(normalizedValue);
      if (!mountedRef.current || request !== copyRequestRef.current) {
        return;
      }
      setCopyFeedback('success');
    } catch {
      if (!mountedRef.current || request !== copyRequestRef.current) {
        return;
      }
      setCopyFeedback('failure');
    }

    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedback('idle');
      copyFeedbackTimerRef.current = undefined;
    }, 2000);
  };

  return (
    <form
      aria-label={t.app.editor.linkEditor.label}
      className="inline-flex w-fit max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-lg border border-border/80 bg-popover p-1 shadow-lg"
      data-testid="link-editor"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          submit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="flex items-center gap-0.5">
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setInvalid(false);
          }}
          aria-label={t.app.editor.linkEditor.inputLabel}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={cx(
            'h-8 w-[clamp(9rem,42vw,13rem)] min-w-0 flex-none border border-transparent bg-transparent px-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0',
            invalid &&
              'border-destructive-foreground/80 text-foreground focus-visible:ring-destructive-foreground/50',
          )}
          placeholder={t.app.editor.linkEditor.placeholder}
        />

        <TooltipProvider delayDuration={300}>
          <div className="flex gap-0">
            {onCopy ? (
              <LinkEditorButton
                disabled={!valid}
                label={
                  copyFeedback === 'success'
                    ? t.app.editor.linkEditor.copied
                    : copyFeedback === 'failure'
                      ? t.app.editor.linkEditor.copyFailed
                      : t.app.editor.linkEditor.copy
                }
                onClick={() => void copy()}
                onPointerDown={preserveSelection}
                type="button"
              >
                {copyFeedback === 'success' ? (
                  <Check className="text-green-600" />
                ) : copyFeedback === 'failure' ? (
                  <CircleAlert className="text-destructive-foreground" />
                ) : (
                  <Copy />
                )}
              </LinkEditorButton>
            ) : null}

            {onOpen ? (
              <LinkEditorButton
                disabled={!valid}
                label={t.app.editor.linkEditor.open}
                onClick={() => normalizedValue && onOpen(normalizedValue)}
                onPointerDown={preserveSelection}
                type="button"
              >
                <ExternalLink />
              </LinkEditorButton>
            ) : null}

            {onRemove ? (
              <LinkEditorButton
                label={t.app.editor.linkEditor.remove}
                onClick={onRemove}
                onPointerDown={preserveSelection}
                type="button"
              >
                <Unlink />
              </LinkEditorButton>
            ) : null}
          </div>
        </TooltipProvider>
      </div>

      {invalid ? (
        <p
          className="max-w-72 px-2 pt-0.5 pb-1 font-medium text-destructive-foreground text-xs leading-tight"
          id={errorId}
          role="alert"
        >
          {t.app.editor.linkEditor.invalidUrl}
        </p>
      ) : null}
    </form>
  );
}

function LinkEditorButton({
  children,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          aria-label={label}
          className={cx('h-8 w-8 p-0', props.className)}
          size="icon"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export type FloatingLinkEditorCloseReason =
  | 'cancel'
  | 'outside'
  | 'remove'
  | 'submit';

type FloatingLinkEditorProps = {
  editorView: EditorView;
  ext: Extensions;
  initialHref: string;
  editingLink: boolean;
  anchorEl: UseFloatingPositionProps['anchorEl'];
  onClose: (reason: FloatingLinkEditorCloseReason) => void;
  autoFocus?: boolean;
  placement?: UseFloatingPositionProps['placement'];
  inline?: boolean;
  onOpen?: (href: string) => void;
};

/** Shared floating controller for cursor and selection link editing. */
export function FloatingLinkEditor({
  editorView,
  ext,
  initialHref,
  editingLink,
  anchorEl,
  onClose,
  autoFocus = false,
  placement,
  inline = false,
  onOpen,
}: FloatingLinkEditorProps) {
  const [draft, setDraft] = useState(initialHref);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const didAutoFocusRef = useRef(false);
  const focusInputAfterPosition = useCallback(() => {
    const input = inputRef.current;
    if (!autoFocus || didAutoFocusRef.current || !input) {
      return;
    }
    didAutoFocusRef.current = true;
    input.focus({ preventScroll: true });
  }, [autoFocus]);
  const floatingRef = useFloatingPosition({
    show: true,
    anchorEl,
    boundaryElement: editorView.dom,
    placement,
    inline,
    onPositioned: focusInputAfterPosition,
  });

  const setRefs = (node: HTMLDivElement | null) => {
    popupRef.current = node;
    floatingRef.current = node;
  };

  const close = (reason: FloatingLinkEditorCloseReason) => {
    onClose(reason);
    if (reason !== 'outside') {
      editorView.focus();
    }
  };

  const updateLink = (href?: string) => {
    ext.link.command.updateLink(href)(
      editorView.state,
      editorView.dispatch,
      editorView,
    );
  };

  const commitChangedDraft = () => {
    if (draft === initialHref) {
      return;
    }
    const normalized = normalizeHttpUrl(draft);
    if (normalized) {
      updateLink(normalized);
    }
  };

  useOutsidePointer({
    enabled: true,
    ownerDocument: editorView.dom.ownerDocument,
    popupRef,
    onOutside: () => {
      commitChangedDraft();
      close('outside');
    },
  });

  return (
    <div
      ref={setRefs}
      className="w-max max-w-[calc(100vw-1rem)]"
      style={FLOATING_INITIAL_STYLE}
    >
      <LinkEditor
        inputRef={inputRef}
        value={draft}
        onChange={setDraft}
        onSubmit={(value) => {
          updateLink(value);
          close('submit');
        }}
        onRemove={
          editingLink
            ? () => {
                updateLink(undefined);
                close('remove');
              }
            : undefined
        }
        onCancel={() => close('cancel')}
        onCopy={
          editingLink
            ? (value) => navigator.clipboard.writeText(value)
            : undefined
        }
        onOpen={editingLink && onOpen ? onOpen : undefined}
      />
    </div>
  );
}
