// @vitest-environment jsdom
import type { EditorView } from 'prosemirror-view';
import { describe, expect, it, vi } from 'vitest';
import { assertIsDefined } from '../../common';
import {
  createVirtualElementFromRange,
  createVirtualElementFromSelection,
} from '../position';

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

  describe('createVirtualElementFromSelection', () => {
    it('clones an editor-owned DOM range and forwards multiline rects', () => {
      const editor = document.createElement('div');
      const text = document.createTextNode('selected text');
      editor.append(text);
      document.body.append(editor);

      const sourceRange = document.createRange();
      sourceRange.setStart(text, 0);
      sourceRange.setEnd(text, 8);
      const boundingRect = new DOMRect(10, 20, 100, 40);
      const clientRects = [
        new DOMRect(10, 20, 100, 20),
        new DOMRect(10, 40, 60, 20),
      ];
      sourceRange.getBoundingClientRect = vi.fn(() => boundingRect);
      sourceRange.getClientRects = vi.fn(
        (): DOMRectList => clientRects as unknown as DOMRectList,
      );
      const clonedRange = sourceRange.cloneRange();
      clonedRange.getBoundingClientRect = sourceRange.getBoundingClientRect;
      clonedRange.getClientRects = sourceRange.getClientRects;
      sourceRange.cloneRange = vi.fn(() => clonedRange);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(sourceRange);

      const view = {
        dom: editor,
        isDestroyed: false,
      } as unknown as EditorView;
      const virtual = createVirtualElementFromSelection(view, 1, 9);

      expect(sourceRange.cloneRange).toHaveBeenCalledOnce();
      expect(virtual?.contextElement).toBe(editor);
      expect(virtual?.getBoundingClientRect()).toBe(boundingRect);
      expect(virtual?.getClientRects?.()).toBe(clientRects);
    });

    it('ignores a range outside the editor and uses coordinate fallback', () => {
      const editor = document.createElement('div');
      const outside = document.createTextNode('outside');
      document.body.append(editor, outside);
      const range = document.createRange();
      range.selectNode(outside);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const view = {
        dom: editor,
        isDestroyed: false,
        coordsAtPos: vi.fn((pos: number) => ({
          left: pos * 10,
          right: pos * 10,
          top: 5,
          bottom: 15,
        })),
      } as unknown as EditorView;

      const virtual = createVirtualElementFromSelection(view, 1, 3);
      expect(virtual?.contextElement).toBe(editor);
      expect(virtual?.getBoundingClientRect().left).toBe(10);
      expect(virtual?.getBoundingClientRect().right).toBe(30);
    });

    it('never throws for destroyed or unmappable views', () => {
      expect(
        createVirtualElementFromSelection(
          { isDestroyed: true } as unknown as EditorView,
          1,
          2,
        ),
      ).toBeNull();

      const editor = document.createElement('div');
      const view = {
        dom: editor,
        isDestroyed: false,
        coordsAtPos: vi.fn(() => {
          throw new Error('unmappable');
        }),
      } as unknown as EditorView;
      expect(createVirtualElementFromSelection(view, 1, 2)).toBeNull();
    });
  });
});
