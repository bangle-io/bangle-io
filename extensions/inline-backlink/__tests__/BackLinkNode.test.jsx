import React from 'react';
import {
  createNote,
  useWorkspacePath,
  cachedListAllNoteWsPaths,
} from 'workspace/index';
import { render, fireEvent, act } from '@testing-library/react';
import { sleep } from 'utils/utility';
import { SpecRegistry } from '@bangle.dev/core';
import { coreSpec } from '@bangle.dev/core/utils/core-components';
import { BackLinkNode } from '../BackLinkNode';

jest.mock('workspace/index', () => {
  const workspaceThings = jest.requireActual('workspace/index');
  return {
    ...workspaceThings,
    useWorkspacePath: jest.fn(),
    cachedListAllNoteWsPaths: jest.fn(),
    createNote: jest.fn(),
  };
});

const bangleIOContext = {
  specRegistry: new SpecRegistry(coreSpec()),
};

describe('BackLinkNode', () => {
  const pushWsPathMock = jest.fn();
  beforeEach(() => {
    useWorkspacePath.mockImplementation(() => ({
      wsName: 'test-ws',
      pushWsPath: pushWsPathMock,
    }));
    cachedListAllNoteWsPaths.mockImplementation(async () => []);
    createNote.mockImplementation(async () => {});
  });

  test('renders correctly', async () => {
    const renderResult = render(
      <BackLinkNode
        nodeAttrs={{ path: 'some/path', title: undefined }}
        bangleIOContext={bangleIOContext}
      />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <button
          class="back-link"
          draggable="false"
        >
          [[some/path]]
        </button>
      </div>
    `);
  });

  test('renders title if it exists', async () => {
    const renderResult = render(
      <BackLinkNode
        nodeAttrs={{ path: 'some/path', title: 'monako' }}
        bangleIOContext={bangleIOContext}
      />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <button
          class="back-link"
          draggable="false"
        >
          [[monako]]
        </button>
      </div>
    `);
  });

  describe('clicking', () => {
    const clickSetup = async ({ path, title = 'monako' }, clickOpts) => {
      const renderResult = render(
        <BackLinkNode
          nodeAttrs={{ path, title: 'monako' }}
          bangleIOContext={bangleIOContext}
        />,
      );
      const prom = sleep();
      fireEvent.click(renderResult.getByText(/monako/i), clickOpts);

      // wait for the promise in click to resolve
      await act(() => prom);
      return renderResult;
    };

    test('clicks correctly when there is a match', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/some/path.md'];
      });

      // wait for the promise in click to resolve
      await clickSetup({ path: 'magic/some/path' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/path.md',
        false,
        false,
      );
    });

    test('picks the top most when there are two matches match', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/note1.md', 'test-ws:magic/some/note1.md'];
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('doesnt add md if already there', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/note1.md', 'test-ws:magic/some/note1.md'];
      });

      await clickSetup({ path: 'note1.md' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('picks the least nested when there are three matches match', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some/note1.md',
          'test-ws:magic/some-other/place/dig/note1.md',
        ];
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        false,
        false,
      );
    });

    test('fall backs to  case insensitive if no case sensitive match', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/note1.md'];
      });

      await clickSetup({ path: 'Note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('Get the exact match if it exists', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/NoTe1.md', 'test-ws:note1.md'];
      });

      await clickSetup({ path: 'NoTe1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/NoTe1.md',
        false,
        false,
      );
    });

    test("doesn't confuse if match ends with same", async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/something-note1.md',
          'test-ws:magic/some-other/place/dig/some-else-note1.md',
        ];
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note1.md', false, false);
    });

    test('doesnt confuse if a subdirectory path match partially matches 1', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some-other/place/dig/some-else-note1.md',
        ];
      });

      // notice the `tel` and `hotel`
      await clickSetup({ path: 'tel/note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:tel/note1.md',
        false,
        false,
      );
    });

    test('doesnt confuse if a subdirectory path match partially matches 2', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/tel/note1.md',
        ];
      });

      await clickSetup({ path: 'tel/note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:tel/note1.md',
        false,
        false,
      );
    });

    test('matches file name', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/tel/note1.md',
        ];
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/tel/note1.md',
        false,
        false,
      );
    });

    test('if no file name match', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/tel/note1.md',
        ];
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('opens sidebar on shift click', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some/note1.md',
          'test-ws:magic/some-other/place/dig/note1.md',
        ];
      });

      await clickSetup({ path: 'note1' }, { shiftKey: true });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        false,
        true,
      );
    });

    test('opens new tab on shift click', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some/note1.md',
          'test-ws:magic/some-other/place/dig/note1.md',
        ];
      });

      await clickSetup({ path: 'note1' }, { metaKey: true });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        true,
        false,
      );
    });

    test('no click if path validation fails', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return ['test-ws:magic/some/note1.md'];
      });

      const renderResult = await clickSetup({ path: 'note:1' });

      expect(pushWsPathMock).toBeCalledTimes(0);
      expect(renderResult.container).toMatchInlineSnapshot(`
        <div>
          <button
            class="back-link"
            draggable="false"
          >
            [[Invalid link!monako]]
          </button>
        </div>
      `);
    });

    test('if no match still clicks', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some/note1.md',
          'test-ws:magic/some-other/place/dig/note1.md',
        ];
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('if no match still clicks 2', async () => {
      cachedListAllNoteWsPaths.mockImplementation(async () => {
        return [
          'test-ws:magic/some-place/hotel/note1.md',
          'test-ws:magic/some/note1.md',
          'test-ws:magic/some-other/place/dig/note1.md',
        ];
      });

      await clickSetup({ path: 'some-place/note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:some-place/note2.md',
        false,
        false,
      );
    });
  });
});
