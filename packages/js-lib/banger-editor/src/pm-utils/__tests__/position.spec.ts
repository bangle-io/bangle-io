// @vitest-environment jsdom
import type { EditorView } from 'prosemirror-view';
import { describe, expect, it, vi } from 'vitest';
import { assertIsDefined } from '../../common';
import { createVirtualElementFromRange } from '../position';

describe('pm-utils/position', () => {
  describe('createVirtualElementFromRange', () => {
    it('returns null if view is destroyed', () => {
      const view = { isDestroyed: true } as unknown as EditorView;

      expect(createVirtualElementFromRange(view, 0, 0)).toBeNull();
    });

    it('returns null if start position is invalid', () => {
      const view = {
        isDestroyed: false,

        coordsAtPos: vi.fn().mockReturnValueOnce(null),
      } as unknown as EditorView;

      expect(createVirtualElementFromRange(view, 0, 0)).toBeNull();
    });

    it('returns null if end position is invalid', () => {
      const view = {
        isDestroyed: false,

        coordsAtPos: vi

          .fn()

          .mockReturnValueOnce({ left: 0, top: 0, right: 0, bottom: 0 }),
      } as unknown as EditorView;

      expect(createVirtualElementFromRange(view, 0, 0)).toBeNull();
    });

    it('creates a VirtualElement for valid positions', () => {
      const view = {
        isDestroyed: false,

        coordsAtPos: vi.fn().mockImplementation((pos) => {
          if (pos === 0) {
            return { left: 10, top: 15, right: 20, bottom: 25 };
          }

          if (pos === 1) {
            return { left: 30, top: 35, right: 40, bottom: 45 };
          }

          return null;
        }),
      } as unknown as EditorView;

      const virtualElement = createVirtualElementFromRange(view, 0, 1);

      expect(virtualElement).not.toBeNull();
      assertIsDefined(virtualElement);

      const rect = virtualElement.getBoundingClientRect();

      expect(rect.left).toBe(10);

      expect(rect.top).toBe(15);

      expect(rect.right).toBe(40);

      expect(rect.bottom).toBe(45);

      expect(rect.width).toBe(30);

      expect(rect.height).toBe(30);
    });
  });
});
