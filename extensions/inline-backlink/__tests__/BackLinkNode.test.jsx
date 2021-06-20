import React from 'react';

import { useWorkspaceContext } from 'workspace-context/index';
import { render, fireEvent, act } from '@testing-library/react';
import { sleep } from 'utils/utility';
import { coreSpec, corePlugins } from '@bangle.dev/core/utils/core-components';
import { BackLinkNode } from '../BackLinkNode';
import { ExtensionRegistry, Extension } from 'extension-registry/index';
import inlineBackLinkExtension from '../index';

jest.mock('workspace-context/index', () => {
  return {
    ...jest.requireActual('workspace-context/index'),
    useWorkspaceContext: jest.fn(),
  };
});

const coreExtension = Extension.create({
  name: 'core',
  editor: {
    specs: [coreSpec()],
    plugins: [...corePlugins()],
  },
});

const extensionRegistry = new ExtensionRegistry([
  coreExtension,
  inlineBackLinkExtension,
]);

describe('BackLinkNode', () => {
  let pushWsPathMock = jest.fn();
  let createNote;

  beforeEach(() => {
    createNote = jest.fn(async () => {});
    pushWsPathMock = jest.fn();
    useWorkspaceContext.mockImplementation(() => ({
      wsName: 'test-ws',
      pushWsPath: pushWsPathMock,
      noteWsPaths: [],
      createNote,
    }));
  });

  test('renders correctly', async () => {
    const renderResult = render(
      <BackLinkNode
        nodeAttrs={{ path: 'some/path', title: undefined }}
        extensionRegistry={extensionRegistry}
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
        extensionRegistry={extensionRegistry}
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
          extensionRegistry={extensionRegistry}
        />,
      );
      const prom = sleep();
      fireEvent.click(renderResult.getByText(/monako/i), clickOpts);

      // wait for the promise in click to resolve
      await act(() => prom);
      return renderResult;
    };

    test('clicks correctly when there is a match', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: ['test-ws:magic/some/path.md'],
          createNote,
        };
      });

      // wait for the promise in click to resolve
      await clickSetup({ path: 'magic/some/path' });

      expect(createNote).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/path.md',
        false,
        false,
      );
    });

    test('picks the top most when there are two matches match', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: [
            'test-ws:magic/note1.md',
            'test-ws:magic/some/note1.md',
          ],
          createNote,
        };
      });

      await clickSetup({ path: 'note1' });
      expect(createNote).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('doesnt add md if already there', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: [
            'test-ws:magic/note1.md',
            'test-ws:magic/some/note1.md',
          ],
          createNote,
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
          createNote,
        };
      });

      await clickSetup({ path: 'note1' });
      expect(createNote).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        false,
        false,
      );
    });

    test('fall backs to  case insensitive if no case sensitive match', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: ['test-ws:magic/note1.md'],
          createNote,
        };
      });

      await clickSetup({ path: 'Note1' });
      expect(createNote).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('Get the exact match if it exists', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: ['test-ws:magic/NoTe1.md', 'test-ws:note1.md'],
          createNote,
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/something-note1.md',
            'test-ws:magic/some-other/place/dig/some-else-note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note1.md', false, false);
    });

    test('doesnt confuse if a subdirectory path match partially matches 1', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some-other/place/dig/some-else-note1.md',
          ],
          createNote,
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('opens sidebar on shift click', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          noteWsPaths: ['test-ws:magic/some/note1.md'],
          createNote,
        };
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
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('if no match still clicks 2', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
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

    test('matches if path follows local file system style', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          primaryWsPath: 'test-ws:magic/hello/beautiful/world.md',
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note2.md',
            'test-ws:magic/hello/beautiful/world.md',
            'test-ws:magic/note2.md',
          ],
        };
      });

      await clickSetup({ path: '../note2' });

      expect(createNote).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/hello/note2.md',
        false,
        false,
      );
    });

    test('if no match creates note', async () => {
      useWorkspaceContext.mockImplementation(() => {
        return {
          wsName: 'test-ws',
          pushWsPath: pushWsPathMock,
          createNote,
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(createNote).toBeCalledTimes(1);
      expect(createNote).nthCalledWith(
        1,
        extensionRegistry,
        'test-ws:note2.md',
        {
          open: false,
        },
      );
      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });
  });
});
