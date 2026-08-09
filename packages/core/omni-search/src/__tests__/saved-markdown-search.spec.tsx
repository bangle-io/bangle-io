// @vitest-environment jsdom
import type {
  SavedMarkdownSearchResult,
  SearchSavedMarkdownInput,
} from '@bangle.io/service-core';
import { Command, CommandList } from '@bangle.io/ui-components';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SavedMarkdownSearchRoute,
  type SavedMarkdownSearchState,
  useSavedMarkdownSearch,
} from '../saved-markdown-search';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function searchResult(wsPath: string): SavedMarkdownSearchResult {
  return {
    groups: [
      {
        matches: [{ lineNumber: 2, snippet: 'raw **Needle** source' }],
        wsPath,
      },
    ],
    skipped: { oversizedWsPaths: [], unreadableWsPaths: [] },
    truncated: false,
  };
}

function SearchHarness({
  open,
  query,
  searchSavedMarkdown,
  wsName,
}: {
  open: boolean;
  query: string;
  searchSavedMarkdown: (
    input: SearchSavedMarkdownInput,
  ) => Promise<SavedMarkdownSearchResult>;
  wsName: string | undefined;
}) {
  const service = React.useMemo(
    () => ({ searchSavedMarkdown }),
    [searchSavedMarkdown],
  );
  const state = useSavedMarkdownSearch({
    debounceMs: 20,
    open,
    query,
    service,
    wsName,
  });
  return (
    <div data-testid="state">
      {state.status === 'ready'
        ? state.result.groups.at(0)?.wsPath
        : state.status}
    </div>
  );
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSavedMarkdownSearch', () => {
  it('aborts superseded searches and never renders their stale results', async () => {
    vi.useFakeTimers();
    const requests: Array<{
      input: SearchSavedMarkdownInput;
      result: ReturnType<typeof deferred<SavedMarkdownSearchResult>>;
    }> = [];
    const searchSavedMarkdown = (input: SearchSavedMarkdownInput) => {
      const result = deferred<SavedMarkdownSearchResult>();
      requests.push({ input, result });
      return result.promise;
    };
    const rendered = render(
      <SearchHarness
        open
        query="first"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-a"
      />,
    );

    await act(async () => vi.advanceTimersByTime(20));
    expect(requests).toHaveLength(1);

    rendered.rerender(
      <SearchHarness
        open
        query="second"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-a"
      />,
    );
    expect(requests[0]?.input.signal.aborted).toBe(true);
    expect(screen.getByTestId('state').textContent).toBe('loading');

    await act(async () => vi.advanceTimersByTime(20));
    expect(requests).toHaveLength(2);
    await act(async () => {
      requests[1]?.result.resolve(searchResult('workspace-a:second.md'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('state').textContent).toBe(
      'workspace-a:second.md',
    );

    await act(async () => {
      requests[0]?.result.resolve(searchResult('workspace-a:first.md'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('state').textContent).toBe(
      'workspace-a:second.md',
    );
  });

  it('aborts on workspace changes, close, and unmount', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const searchSavedMarkdown = (input: SearchSavedMarkdownInput) => {
      signals.push(input.signal);
      return new Promise<SavedMarkdownSearchResult>(() => {});
    };
    const rendered = render(
      <SearchHarness
        open
        query="needle"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-a"
      />,
    );
    await act(async () => vi.advanceTimersByTime(20));

    rendered.rerender(
      <SearchHarness
        open
        query="needle"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-b"
      />,
    );
    expect(signals[0]?.aborted).toBe(true);
    await act(async () => vi.advanceTimersByTime(20));

    rendered.rerender(
      <SearchHarness
        open={false}
        query="needle"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-b"
      />,
    );
    expect(signals[1]?.aborted).toBe(true);

    rendered.rerender(
      <SearchHarness
        open
        query="needle"
        searchSavedMarkdown={searchSavedMarkdown}
        wsName="workspace-b"
      />,
    );
    await act(async () => vi.advanceTimersByTime(20));
    rendered.unmount();
    expect(signals[2]?.aborted).toBe(true);
  });
});

describe('SavedMarkdownSearchRoute', () => {
  it('groups raw Markdown lines by note and opens the selected note', () => {
    const onSelect = vi.fn();
    const state: SavedMarkdownSearchState = {
      requestKey: 'ready',
      result: {
        groups: [
          {
            matches: [
              { lineNumber: 2, snippet: 'raw **Needle** source' },
              { lineNumber: 8, snippet: '[Needle](target.md)' },
            ],
            wsPath: 'workspace-a:notes/alpha.md',
          },
          {
            matches: [{ lineNumber: 1, snippet: '# NEEDLE heading' }],
            wsPath: 'workspace-a:beta.md',
          },
        ],
        skipped: {
          oversizedWsPaths: ['workspace-a:large.md'],
          unreadableWsPaths: ['workspace-a:locked.md'],
        },
        truncated: true,
      },
      status: 'ready',
    };

    render(
      <Command shouldFilter={false}>
        <CommandList>
          <SavedMarkdownSearchRoute
            onSelect={onSelect}
            query="needle"
            state={state}
            wsName="workspace-a"
          />
        </CommandList>
      </Command>,
    );

    expect(screen.getByText('notes/alpha.md')).toBeTruthy();
    expect(screen.getByText('beta.md')).toBeTruthy();
    expect(screen.getByText('raw **Needle** source')).toBeTruthy();
    expect(
      screen.getByText(/Partial results: skipped 1 unreadable and 1 oversized/),
    ).toBeTruthy();
    expect(screen.getByText(/first 100 matching lines/)).toBeTruthy();

    fireEvent.click(screen.getByText('Line 8'));
    expect(onSelect).toHaveBeenCalledWith('workspace-a:notes/alpha.md');
  });
});
