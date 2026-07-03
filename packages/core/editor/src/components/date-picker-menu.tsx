import { useCoreServices } from '@bangle.io/context';
import { $suggestions, $suggestionUi } from '@bangle.io/prosemirror-plugins';
import { Calendar, CommandHints } from '@bangle.io/ui-components';
import { format } from 'date-fns';
import { useAtomValue, useSetAtom } from 'jotai';
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { DATE_SUGGESTION } from '../extensions';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

// Bound the calendar's month/year dropdowns to a generous window around the
// current year so far-off dates remain reachable without endless clicking.
const CALENDAR_YEAR_SPAN = 100;

/**
 * DatePickerMenu is the floating surface for the `date_suggestion` mark.
 * It activates when the user types the `$date` trigger directly, or when the
 * slash menu's "Date" item swaps the slash mark for the trigger text.
 * Committing a day replaces the trigger text with the formatted date.
 */
export function DatePickerMenu({
  editorName,
}: {
  editorName: string;
}): ReactElement | null {
  const suggestions = useAtomValue($suggestions);
  const setSuggestionUi = useSetAtom($suggestionUi);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const { pmEditorService } = useCoreServices();
  const editorView = pmEditorService.getEditor(editorName);
  const ext = pmEditorService.extensions;
  const suggestion = editorView ? suggestions.get(editorView) : undefined;
  const active =
    suggestion?.markName === DATE_SUGGESTION.markName ? suggestion : undefined;

  const insertDate = useCallback(
    (date: Date) => {
      if (!editorView) {
        return;
      }
      // `focus: true` (the default) returns focus to the editor so the caret
      // lands right after the inserted date.
      ext.dateSuggestions.command.replaceSuggestMarkWith({
        content: format(date, 'PP'),
      })(editorView.state, editorView.dispatch, editorView);
    },
    [editorView, ext],
  );

  const dismiss = useCallback(() => {
    if (!editorView || !active) {
      return;
    }
    ext.dateSuggestions.command.replaceSuggestMarkWith({
      content: '',
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  useEffect(() => {
    if (!active?.show) {
      setSelectedDate(new Date());
    }
  }, [active?.show]);

  useEffect(() => {
    if (!editorView || !active) {
      return;
    }

    setSuggestionUi((existing) => {
      const next = new Map(existing);
      next.set(editorView, {
        ...(next.get(editorView) ?? {}),
        [DATE_SUGGESTION.markName]: {
          // Enter while the editor still has focus commits the highlighted
          // day; once focus is inside the calendar react-day-picker handles
          // Enter/arrow navigation itself.
          onSelect: () => insertDate(selectedDateRef.current),
        },
      });
      return next;
    });

    return () => {
      setSuggestionUi((existing) => {
        const next = new Map(existing);
        const handlers = { ...(next.get(editorView) ?? {}) };
        delete handlers[DATE_SUGGESTION.markName];
        if (Object.keys(handlers).length) {
          next.set(editorView, handlers);
        } else {
          next.delete(editorView);
        }
        return next;
      });
    };
  }, [active, editorView, insertDate, setSuggestionUi]);

  const floatingRef = useFloatingPosition({
    show: Boolean(active?.show),
    anchorEl: () => active?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      // Unlike the shared suggestion keymap (which only strips the mark),
      // an explicit Escape inside the calendar also removes the trigger
      // text and hands focus back to the editor.
      dismiss();
      editorView?.focus();
    },
    [dismiss, editorView],
  );

  if (!editorView || !active?.show) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape handling for a floating popover, not an interactive control.
    <div
      ref={floatingRef}
      style={FLOATING_INITIAL_STYLE}
      className="w-fit overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      onKeyDown={handleKeyDown}
    >
      <Calendar
        mode="single"
        // Move focus to the selected day so arrow keys navigate the grid and
        // Enter commits, without any editor-side key forwarding.
        autoFocus
        captionLayout="dropdown"
        // Hide adjacent-month days so only the visible month is selectable
        // (avoids ambiguous day cells near month boundaries).
        showOutsideDays={false}
        startMonth={new Date(currentYear - CALENDAR_YEAR_SPAN, 0)}
        endMonth={new Date(currentYear + CALENDAR_YEAR_SPAN, 11)}
        defaultMonth={selectedDate}
        selected={selectedDate}
        onSelect={(date) => {
          if (!date) {
            return;
          }
          setSelectedDate(date);
          insertDate(date);
        }}
      />
      <CommandHints
        hints={[
          t.app.editor.datePicker.hintSelect,
          t.app.editor.datePicker.hintDismiss,
        ]}
      />
    </div>
  );
}
