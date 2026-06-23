import { useCoreServices } from '@bangle.io/context';
import {
  rankedFuzzySearch,
  substringFuzzySearch,
} from '@bangle.io/fuzzysearch';
import {
  $suggestions,
  $suggestionUi,
  Fragment,
  type WikiLinkAttrs,
} from '@bangle.io/prosemirror-plugins';
import type { WsFilePath } from '@bangle.io/ws-path';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

type WikiOption = { attrs: WikiLinkAttrs; path?: WsFilePath };

const MAX_OPTIONS = 12;

export function WikiLinkMenu({ editorName }: { editorName: string }) {
  const suggestions = useAtomValue($suggestions);
  const { pmEditorService, workspaceState } = useCoreServices();
  const index = useAtomValue(workspaceState.$wikiLinkIndex);
  const setSuggestionUi = useSetAtom($suggestionUi);
  const listRef = useRef<HTMLDivElement>(null);
  const editorView = pmEditorService.getEditor(editorName);
  const suggestion = editorView ? suggestions.get(editorView) : undefined;
  const active =
    suggestion?.markName === 'wiki_link_suggestion' ? suggestion : undefined;
  const query = active?.text.slice(2) ?? '';

  const options = useMemo<WikiOption[]>(() => {
    if (!index) return [];
    let filtered = index.searchRecords;
    if (query) {
      const bySearchValue = new Map(
        index.searchRecords.map((record) => [record.searchText, record]),
      );
      filtered = rankedFuzzySearch(query, [...bySearchValue.keys()], {
        fuzzySearchFunction: substringFuzzySearch,
        limit: MAX_OPTIONS - 1,
      })
        .map((result) => bySearchValue.get(result.item))
        .filter((record): record is (typeof index.searchRecords)[number] =>
          Boolean(record),
        );
    }
    const matchLimit = query ? MAX_OPTIONS - 1 : MAX_OPTIONS;
    const matches = filtered.slice(0, matchLimit).map((record) => ({
      path: record.wsPath,
      attrs: { target: record.target, label: null },
    }));
    return query
      ? [...matches, { attrs: { target: query, label: null } }]
      : matches;
  }, [index, query]);

  const selectedIndex = Math.max(
    0,
    Math.min(active?.selectedIndex ?? 0, Math.max(0, options.length - 1)),
  );
  const select = useCallback(
    (option: WikiOption | undefined) => {
      if (!editorView || !option) return;
      const node = editorView.state.schema.nodes.wiki_link?.create(
        option.attrs,
      );
      if (!node) return;
      pmEditorService.extensions.wikiSuggestions.command.replaceSuggestMarkWith(
        {
          content: Fragment.from(node),
        },
      )(editorView.state, editorView.dispatch, editorView);
    },
    [editorView, pmEditorService],
  );

  useEffect(() => {
    if (!active || !editorView) return;
    setSuggestionUi((existing) => {
      const next = new Map(existing);
      next.set(editorView, {
        ...(next.get(editorView) ?? {}),
        wiki_link_suggestion: {
          optionCount: options.length,
          onSelect: () => select(options[selectedIndex]),
        },
      });
      return next;
    });
    return () => {
      setSuggestionUi((existing) => {
        const next = new Map(existing);
        const handlers = { ...(next.get(editorView) ?? {}) };
        delete handlers.wiki_link_suggestion;
        if (Object.keys(handlers).length) {
          next.set(editorView, handlers);
        } else {
          next.delete(editorView);
        }
        return next;
      });
    };
  }, [active, editorView, options, select, selectedIndex, setSuggestionUi]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const floatingRef = useFloatingPosition({
    show: Boolean(active?.show),
    anchorEl: () => active?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });
  if (!active?.show || !editorView) return null;

  return (
    <div ref={floatingRef} style={FLOATING_INITIAL_STYLE}>
      <div
        ref={listRef}
        role="listbox"
        aria-label={t.app.editor.wikiLinkMenu.label}
        className="max-h-72 min-w-64 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-muted-foreground">
            {t.app.editor.wikiLinkMenu.empty}
          </div>
        ) : (
          options.map((option, index) => (
            <div
              key={option.path?.wsPath ?? `unresolved:${option.attrs.target}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === selectedIndex}
              data-option-index={index}
              className={`cursor-default rounded px-2 py-1.5 ${
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') select(option);
              }}
            >
              <div>
                {option.path?.fileNameWithoutExtension ??
                  t.app.editor.wikiLinkMenu.linkTo({
                    query: option.attrs.target,
                  })}
              </div>
              {option.path?.getParent()?.path ? (
                <div className="text-muted-foreground text-xs">
                  {option.path.getParent()?.path}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
