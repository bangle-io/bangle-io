import { suggestions } from '@bangle.io/prosemirror-plugins';
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
import { useAtomValue, useSetAtom } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
} from 'react';
import { useCoreServices } from '../../../context/src';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand({
  editorName,
}: {
  editorName: string;
}): ReactElement | null {
  const suggestion = useAtomValue(suggestions.$suggestion);
  const markName = suggestion?.markName;
  const setSuggestionUi = useSetAtom(suggestions.$suggestionUi);
  const commandRef = useRef<HTMLDivElement>(null);
  const prevSelectedIndexRef = useRef<number>(0);
  const { pmEditorService } = useCoreServices();

  // Add effect to watch selectedIndex changes
  useEffect(() => {
    const selectedIndex = suggestion?.selectedIndex ?? 0;
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
  }, [suggestion?.selectedIndex]);

  useEffect(() => {
    if (!markName) {
      return;
    }

    setSuggestionUi((existing) => ({
      ...existing,
      [markName]: {
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
      },
    }));

    return () => {
      setSuggestionUi((existing) => {
        const cloned = { ...existing };
        delete cloned[markName];

        return cloned;
      });
    };
  }, [markName, setSuggestionUi]);

  const slashRef = useFloatingPosition({
    show: Boolean(suggestion?.show),
    anchorEl: () => suggestion?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });
  const editor = pmEditorService.getEditor(editorName);

  const dismissCommandUi = useCallback(() => {
    if (!editor || !suggestion?.markName) {
      return;
    }

    suggestions.replaceSuggestMarkWith({
      markName: suggestion.markName,
      content: '',
    })(editor.view.state, editor.view.dispatch);
  }, [editor, suggestion?.markName]);

  if (!editor || !suggestion?.show) {
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
          value={suggestion.text.slice(1)}
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
                editor.commands.setBlockType({ type: 'paragraph' });
              }}
            >
              Paragraph
            </CommandItem>
            <CommandItem
              value="heading-1"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.setHeading({ level: 1 });
              }}
            >
              Heading 1
            </CommandItem>
            <CommandItem
              value="heading-2"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.setHeading({ level: 2 });
              }}
            >
              Heading 2
            </CommandItem>
            <CommandItem
              value="heading-3"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.setHeading({ level: 3 });
              }}
            >
              Heading 3
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Lists">
            <CommandItem
              value="bullet-list"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.toggleList({ kind: 'bullet' });
              }}
            >
              Bullet list
            </CommandItem>
            <CommandItem
              value="numbered-list"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.toggleList({ kind: 'ordered' });
              }}
            >
              Numbered list
            </CommandItem>
            <CommandItem
              value="todo-list"
              onSelect={() => {
                dismissCommandUi();
                editor.commands.toggleList({ kind: 'task' });
              }}
            >
              To-do list
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Time">
            <CommandItem
              value="today"
              onSelect={() => {
                dismissCommandUi();
                const today = format(new Date(), 'PP');
                editor.commands.insertText({ text: today });
              }}
            >
              Today
            </CommandItem>
            <CommandItem
              value="yesterday"
              onSelect={() => {
                dismissCommandUi();
                const yesterday = format(subDays(new Date(), 1), 'PP');
                editor.commands.insertText({ text: yesterday });
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
                editor.commands.insertText({ text: nextWeek });
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
                editor.commands.insertText({ text: nextMonth });
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
