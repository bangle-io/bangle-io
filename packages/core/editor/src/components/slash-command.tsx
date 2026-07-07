import { $suggestions, Fragment } from '@bangle.io/prosemirror-plugins';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@bangle.io/ui-components';
import {
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useAtomValue } from 'jotai';
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { DATE_SUGGESTION } from '../extensions';
import { useEditorCoreServices } from '../use-editor-core-services';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';
import { useSuggestionUiHandler } from './use-suggestion-ui-handler';

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand({
  editorName,
}: {
  editorName: string;
}): ReactElement | null {
  const suggestions = useAtomValue($suggestions);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);
  const { editorEngine } = useEditorCoreServices();
  const editorView = editorEngine.getEditor(editorName);
  const suggestion = editorView ? suggestions.get(editorView) : undefined;
  const active =
    suggestion?.markName === 'slash_command' ? suggestion : undefined;

  // Add effect to watch selectedIndex changes
  useEffect(() => {
    const selectedIndex = active?.selectedIndex ?? 0;
    const prevIndex = prevSelectedIndexRef.current;

    // Well cmdk isnt the best maintained library, so we need to manually
    // wire up the keyboard navigation.
    if (selectedIndex !== prevIndex && commandRef.current) {
      const key = selectedIndex > prevIndex ? 'ArrowDown' : 'ArrowUp';
      const event = new KeyboardEvent('keydown', {
        key,
        cancelable: true,
        bubbles: true,
      });
      commandRef.current.dispatchEvent(event);
    }

    prevSelectedIndexRef.current = selectedIndex;
  }, [active?.selectedIndex]);

  const slashCommandUiHandler = useMemo(
    () => ({
      onSelect: () => {
        if (commandRef.current) {
          const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            cancelable: true,
            bubbles: true,
          });
          commandRef.current.dispatchEvent(event);
        }
      },
    }),
    [],
  );

  useSuggestionUiHandler({
    active: Boolean(active),
    editorView,
    handler: slashCommandUiHandler,
    markName: 'slash_command',
  });

  const slashRef = useFloatingPosition({
    show: Boolean(active?.show),
    anchorEl: () => active?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  const ext = editorEngine.extensions;

  const dismissCommandUi = useCallback(() => {
    if (!editorView || !active) {
      return;
    }

    ext.suggestions.command.replaceSuggestMarkWith({
      content: '',
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  const openDatePicker = useCallback(() => {
    if (!editorView || !active) {
      return;
    }

    // Swap the slash mark for the date trigger text carrying the
    // `date_suggestion` mark — the same document state as if the user had
    // typed the trigger — so the DatePickerMenu surface takes over.
    const { schema } = editorView.state;
    const mark = schema.mark(DATE_SUGGESTION.markName, {
      trigger: DATE_SUGGESTION.trigger,
    });
    ext.suggestions.command.replaceSuggestMarkWith({
      content: Fragment.from(schema.text(DATE_SUGGESTION.trigger, [mark])),
    })(editorView.state, editorView.dispatch, editorView);
  }, [editorView, active, ext]);

  if (!editorView || !active?.show) {
    return null;
  }

  return (
    <div ref={slashRef} style={FLOATING_INITIAL_STYLE}>
      <Command
        ref={commandRef}
        className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <CommandInput
          hidden
          value={active.text.slice(1)}
          onValueChange={() => {}}
        />
        <CommandEmpty>
          <span className="text-muted-foreground">Nothing found</span>
        </CommandEmpty>
        <CommandList>
          <CommandGroup heading="Basic">
            <CommandItem
              value="paragraph"
              onSelect={() => {
                dismissCommandUi();
                ext.paragraph.command.convertToParagraph(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Paragraph
            </CommandItem>
            <CommandItem
              value="heading-1"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(1)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 1
            </CommandItem>
            <CommandItem
              value="heading-2"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(2)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 2
            </CommandItem>
            <CommandItem
              value="heading-3"
              onSelect={() => {
                dismissCommandUi();
                ext.heading.command.toggleHeading(3)(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Heading 3
            </CommandItem>
            <CommandItem
              value="code-block code fenced-code snippet"
              onSelect={() => {
                dismissCommandUi();
                ext.codeBlock.command.toggleCodeBlock(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Code block
            </CommandItem>
            {!ext.frontmatter.query.hasFrontmatter(editorView.state) && (
              <CommandItem
                value="frontmatter yaml properties metadata"
                onSelect={() => {
                  dismissCommandUi();
                  ext.frontmatter.command.insertFrontmatter(
                    editorView.state,
                    editorView.dispatch,
                    editorView,
                  );
                  // Inserting at the doc top moves focus away from the typed
                  // position; restore it so typing lands in the block.
                  editorView.focus();
                }}
              >
                {t.app.editor.slashCommand.frontmatter}
              </CommandItem>
            )}
            <CommandItem
              value="table grid"
              onSelect={() => {
                dismissCommandUi();
                ext.table.command.insertTable()(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
                // Replacing the focused paragraph with the table drops DOM
                // focus; restore it so typing goes into the first cell.
                editorView.focus();
              }}
            >
              {t.app.editor.slashCommand.table}
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Lists">
            <CommandItem
              value="bullet-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleBulletList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Bullet list
            </CommandItem>
            <CommandItem
              value="numbered-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleOrderedList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Numbered list
            </CommandItem>
            <CommandItem
              value="todo-list"
              onSelect={() => {
                dismissCommandUi();
                ext.list.command.toggleTaskList(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              To-do list
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Time">
            <CommandItem value="date calendar" onSelect={openDatePicker}>
              {t.app.editor.slashCommand.date}
            </CommandItem>
            <CommandItem
              value="today"
              onSelect={() => {
                dismissCommandUi();
                const today = format(new Date(), 'PP');

                ext.base.command.insertText({ text: today })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Today
            </CommandItem>
            <CommandItem
              value="yesterday"
              onSelect={() => {
                dismissCommandUi();
                const yesterday = format(subDays(new Date(), 1), 'PP');
                ext.base.command.insertText({ text: yesterday })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Yesterday
            </CommandItem>
            <CommandItem
              value="next-week"
              onSelect={() => {
                dismissCommandUi();
                const nextWeek = format(
                  startOfWeek(addWeeks(new Date(), 1)),
                  'PPP',
                );
                ext.base.command.insertText({ text: nextWeek })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Next week
            </CommandItem>
            <CommandItem
              value="next-month"
              onSelect={() => {
                dismissCommandUi();
                const nextMonth = format(
                  startOfMonth(addMonths(new Date(), 1)),
                  'PP',
                );
                ext.base.command.insertText({ text: nextMonth })(
                  editorView.state,
                  editorView.dispatch,
                  editorView,
                );
              }}
            >
              Next month
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <CommandHints hints={['Enter to select', 'Escape to dismiss']} />
      </Command>
    </div>
  );
}
