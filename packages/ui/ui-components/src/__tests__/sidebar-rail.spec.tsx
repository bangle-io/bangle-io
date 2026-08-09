// @vitest-environment happy-dom

import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@bangle.io/constants';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar, SidebarProvider, SidebarRail } from '../sidebar';

type RafController = {
  cancel: ReturnType<typeof vi.fn<(id: number) => void>>;
  callbacks: Map<number, FrameRequestCallback>;
  request: ReturnType<typeof vi.fn<(callback: FrameRequestCallback) => number>>;
  run: (id: number) => void;
};

function installControlledRaf(): RafController {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    callbacks.delete(id);
  });
  const run = (id: number) => {
    const callback = callbacks.get(id);
    if (!callback) {
      throw new Error(`Animation frame ${id} is not pending`);
    }
    callbacks.delete(id);
    act(() => callback(0));
  };

  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return { callbacks, cancel, request, run };
}

function mountRail({
  width = SIDEBAR_DEFAULT_WIDTH,
  side = 'left',
  onWidthChange = vi.fn(),
}: {
  width?: number;
  side?: 'left' | 'right';
  onWidthChange?: (width: number) => void;
} = {}) {
  const view = render(
    <SidebarProvider
      open
      width={width}
      onOpenChange={() => {}}
      onWidthChange={onWidthChange}
    >
      <Sidebar side={side}>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>,
  );
  const wrapper = view.container.querySelector<HTMLElement>(
    '[data-slot="sidebar-wrapper"]',
  );
  const rail = view.container.querySelector<HTMLHRElement>(
    '[data-sidebar="rail"]',
  );
  if (!wrapper || !rail) {
    throw new Error('Expected the sidebar wrapper and rail to render');
  }

  Object.defineProperties(rail, {
    hasPointerCapture: {
      configurable: true,
      value: vi.fn(() => true),
    },
    releasePointerCapture: {
      configurable: true,
      value: vi.fn(),
    },
    setPointerCapture: {
      configurable: true,
      value: vi.fn(),
    },
  });

  return { onWidthChange, rail, view, wrapper };
}

function pointer(
  rail: HTMLHRElement,
  type: 'down' | 'move' | 'up' | 'cancel',
  clientX: number,
) {
  const init: PointerEventInit = {
    button: 0,
    clientX,
    isPrimary: true,
    pointerId: 7,
  };
  switch (type) {
    case 'down':
      fireEvent.pointerDown(rail, init);
      return;
    case 'move':
      fireEvent.pointerMove(rail, init);
      return;
    case 'up':
      fireEvent.pointerUp(rail, init);
      return;
    case 'cancel':
      fireEvent.pointerCancel(rail, init);
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1200,
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SidebarRail pointer resizing', () => {
  it('previews immediately, batches move bursts to the newest width, and persists only on pointer up', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail, wrapper } = mountRail({
      onWidthChange,
      width: 300,
    });

    pointer(rail, 'down', 100);
    expect(wrapper.dataset.sidebarResizing).toBe('true');
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('300px');
    expect(raf.request).not.toHaveBeenCalled();

    pointer(rail, 'move', 110);
    pointer(rail, 'move', 145);
    pointer(rail, 'move', 130);
    expect(raf.request).toHaveBeenCalledOnce();
    expect(onWidthChange).not.toHaveBeenCalled();
    raf.run(1);
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('330px');

    pointer(rail, 'move', 150);
    pointer(rail, 'move', 160);
    expect(raf.request).toHaveBeenCalledTimes(2);
    expect(onWidthChange).not.toHaveBeenCalled();
    raf.run(2);
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('360px');

    pointer(rail, 'up', 170);
    expect(onWidthChange).toHaveBeenCalledOnce();
    expect(onWidthChange).toHaveBeenCalledWith(370);
    expect(wrapper.dataset.sidebarResizing).toBe('false');
  });

  it('cancels a pending frame and commits the exact pointer-up coordinate without a stale preview', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail, wrapper } = mountRail({
      onWidthChange,
      width: 280,
    });

    pointer(rail, 'down', 100);
    pointer(rail, 'move', 140);
    const staleCallback = raf.callbacks.get(1);
    expect(staleCallback).toBeDefined();

    pointer(rail, 'up', 175);
    expect(raf.cancel).toHaveBeenCalledWith(1);
    expect(onWidthChange).toHaveBeenCalledOnce();
    expect(onWidthChange).toHaveBeenCalledWith(355);
    expect(wrapper.dataset.sidebarResizing).toBe('false');

    act(() => staleCallback?.(0));
    expect(onWidthChange).toHaveBeenCalledOnce();
    expect(wrapper.dataset.sidebarResizing).toBe('false');
  });

  it('cancels a pending frame and restores the starting width on pointer cancel', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail, wrapper } = mountRail({
      onWidthChange,
      width: 310,
    });

    pointer(rail, 'down', 100);
    pointer(rail, 'move', 180);
    const staleCallback = raf.callbacks.get(1);
    pointer(rail, 'cancel', 180);

    expect(raf.cancel).toHaveBeenCalledWith(1);
    expect(onWidthChange).toHaveBeenCalledOnce();
    expect(onWidthChange).toHaveBeenCalledWith(310);
    expect(wrapper.dataset.sidebarResizing).toBe('false');
    act(() => staleCallback?.(0));
    expect(wrapper.dataset.sidebarResizing).toBe('false');
  });

  it('cancels and clears pending drag work on unmount without committing', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail, view } = mountRail({ onWidthChange });

    pointer(rail, 'down', 100);
    pointer(rail, 'move', 150);
    const staleCallback = raf.callbacks.get(1);
    view.unmount();

    expect(raf.cancel).toHaveBeenCalledWith(1);
    expect(onWidthChange).not.toHaveBeenCalled();
    act(() => staleCallback?.(0));
    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it('leaves keyboard and double-click resizing synchronous and RAF-free', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail } = mountRail({
      onWidthChange,
      width: 300,
    });

    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    fireEvent.doubleClick(rail);

    expect(onWidthChange).toHaveBeenNthCalledWith(1, 308);
    expect(onWidthChange).toHaveBeenNthCalledWith(2, SIDEBAR_DEFAULT_WIDTH);
    expect(raf.request).not.toHaveBeenCalled();
    expect(raf.cancel).not.toHaveBeenCalled();
  });

  it('applies right-side direction and clamps previews and commits', () => {
    const raf = installControlledRaf();
    const onWidthChange = vi.fn();
    const { rail, wrapper } = mountRail({
      onWidthChange,
      side: 'right',
      width: 300,
    });

    pointer(rail, 'down', 300);
    pointer(rail, 'move', 500);
    raf.run(1);
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe(
      `${SIDEBAR_MIN_WIDTH}px`,
    );
    expect(onWidthChange).not.toHaveBeenCalled();

    pointer(rail, 'up', 0);
    expect(onWidthChange).toHaveBeenCalledOnce();
    expect(onWidthChange).toHaveBeenCalledWith(SIDEBAR_MAX_WIDTH);
  });
});
