// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />

import '@testing-library/jest-dom/vitest';
import type { EditorSavePhase } from '@bangle.io/context';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EDITOR_SAVING_DELAY_MS,
  EditorSaveStatus,
} from '../editor-save-status';

const NOTE_PATH = 'workspace:note.md';

class SaveStatusFake {
  readonly retries: string[] = [];
  readonly subscriptions: string[] = [];

  private phases = new Map<string, EditorSavePhase>();
  private listeners = new Map<string, Set<() => void>>();

  constructor(readonly engineId: string = 'prosemirror') {}

  getSaveStatus = (wsPath: string): EditorSavePhase =>
    this.phases.get(wsPath) ?? 'clean';

  retryFailedSave = (wsPath?: string): boolean => {
    if (wsPath === undefined) {
      return false;
    }
    this.retries.push(wsPath);
    return true;
  };

  subscribeToSaveStatus = (
    listener: () => void,
    wsPath?: string,
  ): (() => void) => {
    if (wsPath === undefined) {
      throw new Error('The save indicator must subscribe to one exact path');
    }
    this.subscriptions.push(wsPath);
    const listeners = this.listeners.get(wsPath) ?? new Set();
    listeners.add(listener);
    this.listeners.set(wsPath, listeners);
    return () => {
      listeners.delete(listener);
    };
  };

  setPhase(wsPath: string, phase: EditorSavePhase): void {
    this.phases.set(wsPath, phase);
    for (const listener of this.listeners.get(wsPath) ?? []) {
      listener();
    }
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('EditorSaveStatus', () => {
  it('shows Saved only after exact-path activity becomes durably clean', () => {
    vi.useFakeTimers();
    const source = new SaveStatusFake();
    render(<EditorSaveStatus source={source} wsPath={NOTE_PATH} />);

    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveClass('w-20');
    expect(source.subscriptions).toEqual([NOTE_PATH]);

    act(() => {
      source.setPhase(NOTE_PATH, 'pending');
    });
    expect(status).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(EDITOR_SAVING_DELAY_MS - 1);
    });
    expect(screen.queryByText(t.app.editor.saveStatus.saving)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(status).toHaveTextContent(t.app.editor.saveStatus.saving);

    act(() => {
      source.setPhase(NOTE_PATH, 'clean');
    });
    expect(status).toHaveTextContent(t.app.editor.saveStatus.saved);

    act(() => {
      source.setPhase(NOTE_PATH, 'pending');
    });
    expect(status).toBeEmptyDOMElement();
    expect(screen.queryByText(t.app.editor.saveStatus.saved)).toBeNull();
  });

  it('cancels the saving delay and keeps Retry until queue truth changes', () => {
    vi.useFakeTimers();
    const source = new SaveStatusFake();
    render(<EditorSaveStatus source={source} wsPath={NOTE_PATH} />);

    act(() => {
      source.setPhase(NOTE_PATH, 'pending');
      vi.advanceTimersByTime(100);
      source.setPhase(NOTE_PATH, 'failed');
    });

    const retry = screen.getByRole('button', {
      name: t.app.editor.saveStatus.retry,
    });
    expect(retry).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(EDITOR_SAVING_DELAY_MS);
    });
    expect(screen.queryByText(t.app.editor.saveStatus.saving)).toBeNull();

    fireEvent.click(retry);
    expect(source.retries).toEqual([NOTE_PATH]);
    expect(retry).toBeVisible();

    act(() => {
      source.setPhase(NOTE_PATH, 'pending');
    });
    expect(screen.queryByRole('button')).toBeNull();

    act(() => {
      source.setPhase(NOTE_PATH, 'clean');
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      t.app.editor.saveStatus.saved,
    );
  });

  it('does not carry a verified Saved label to another path', () => {
    vi.useFakeTimers();
    const source = new SaveStatusFake();
    const { rerender } = render(
      <EditorSaveStatus source={source} wsPath={NOTE_PATH} />,
    );

    act(() => {
      source.setPhase(NOTE_PATH, 'pending');
    });
    act(() => {
      source.setPhase(NOTE_PATH, 'clean');
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      t.app.editor.saveStatus.saved,
    );

    const otherPath = 'workspace:other.md';
    rerender(<EditorSaveStatus source={source} wsPath={otherPath} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(source.subscriptions).toEqual([NOTE_PATH, otherPath]);
  });

  it('does not render a save control for the read-only engine', () => {
    const readOnlySource = new SaveStatusFake('wordgard');

    render(<EditorSaveStatus source={readOnlySource} wsPath={NOTE_PATH} />);

    expect(screen.queryByTestId('editor-save-status')).toBeNull();
    expect(readOnlySource.subscriptions).toEqual([]);
  });
});
