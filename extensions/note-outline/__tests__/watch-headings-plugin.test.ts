/**
 * @jest-environment @bangle.io/jsdom-env
 */
import {
  setupTestExtension,
  testEditorMarkdown,
} from '@bangle.io/test-utils-2';

import { getHeadings } from '../watch-headings-plugin';
import noteOutline from '../index';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
});

function setup() {
  const ctx = setupTestExtension({
    extensions: [noteOutline],
    abortSignal: abortController.signal,
    editor: true,
  });

  const { render } = testEditorMarkdown(ctx.eternalVars);

  return {
    render,
  };
}

describe('getHeadings', () => {
  describe('three headings', () => {
    const md = `
# Apex

lab

## Max

ant

## Rand

love
`;

    test('When a heading exists before visible area and a heading exists inside the visible area', () => {
      const { render } = setup();
      const { editor } = render(md);
      const result = getHeadings(editor.view.state, {
        minStartPosition: 11, // before `Max`
        maxStartPosition: 16, // before `ant`
      });

      expect(result).toEqual([
        {
          isActive: true,
          hasContentInsideViewport: false,
          level: 1,
          offset: 0,
          title: 'Apex',
        },
        {
          isActive: false,
          hasContentInsideViewport: true,
          level: 2,
          offset: 11,
          title: 'Max',
        },
        {
          isActive: false,
          hasContentInsideViewport: false,
          level: 2,
          offset: 21,
          title: 'Rand',
        },
      ]);
    });

    test('When only last heading is inside visible area', () => {
      const { render } = setup();
      const { editor } = render(md);
      const result = getHeadings(editor.view.state, {
        minStartPosition: 21, // before `Rand`
        maxStartPosition: 27, // before `love`
      });

      expect(result).toEqual([
        {
          isActive: true,
          hasContentInsideViewport: false,
          level: 1,
          offset: 0,
          title: 'Apex',
        },
        {
          isActive: false,
          hasContentInsideViewport: false,
          level: 2,
          offset: 11,
          title: 'Max',
        },
        {
          isActive: false,
          hasContentInsideViewport: true,
          level: 2,
          offset: 21,
          title: 'Rand',
        },
      ]);
    });

    test('When last two headings are inside visible area', () => {
      const { render } = setup();
      const { editor } = render(md);
      const result = getHeadings(editor.view.state, {
        minStartPosition: 11, // before `Max`
        maxStartPosition: 27, // before `love`
      });

      expect(result).toEqual([
        {
          isActive: true,
          hasContentInsideViewport: false,
          level: 1,
          offset: 0,
          title: 'Apex',
        },
        {
          isActive: false,
          hasContentInsideViewport: true,
          level: 2,
          offset: 11,
          title: 'Max',
        },
        {
          isActive: false,
          hasContentInsideViewport: true,
          level: 2,
          offset: 21,
          title: 'Rand',
        },
      ]);
    });
  });

  describe('one heading', () => {
    const md = `
  # Apex

  lab
  `;

    test('should mark the first heading visible when the only heading is outside of visible area', () => {
      const { render } = setup();
      const { editor } = render(md);
      const result = getHeadings(editor.view.state, {
        minStartPosition: 50,
        maxStartPosition: 100,
      });

      expect(result).toEqual([
        {
          isActive: true,
          hasContentInsideViewport: true,
          level: 1,
          offset: 0,
          title: 'Apex',
        },
      ]);
    });

    test('When inside of visible area', () => {
      const { render } = setup();
      const { editor } = render(md);

      const result = getHeadings(editor.view.state, {
        minStartPosition: 0,
        maxStartPosition: 6,
      });

      expect(result).toEqual([
        {
          isActive: true,
          hasContentInsideViewport: true,
          level: 1,
          offset: 0,
          title: 'Apex',
        },
      ]);
    });
  });

  describe('text before heading', () => {
    const md = `
  lab

  magic

  # Apex
  `;

    test('When no heading inside visible should show the later heading as visible', () => {
      const { render } = setup();
      const { editor } = render(md);

      const result = getHeadings(editor.view.state, {
        minStartPosition: 0,
        maxStartPosition: 5, // before magic
      });

      expect(result).toEqual([
        {
          isActive: false,
          hasContentInsideViewport: false,
          level: 1,
          offset: 12,
          title: 'Apex',
        },
      ]);
    });

    test('When heading inside visible', () => {
      const { render } = setup();
      const { editor } = render(md);

      const result = getHeadings(editor.view.state, {
        minStartPosition: 0,
        maxStartPosition: 12, // before apex
      });

      expect(result).toEqual([
        {
          isActive: false,
          hasContentInsideViewport: true,
          level: 1,
          offset: 12,
          title: 'Apex',
        },
      ]);
    });
  });

  describe('works when no intersection state', () => {
    const md = `
  lab

  magic

  # Apex
  `;

    test('works', () => {
      const { render } = setup();
      const { editor } = render(md);
      const result = getHeadings(editor.view.state);

      expect(result).toEqual([
        {
          isActive: false,
          hasContentInsideViewport: false,
          level: 1,
          offset: 12,
          title: 'Apex',
        },
      ]);
    });
  });
});
