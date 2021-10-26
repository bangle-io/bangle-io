import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { UIManager, useUIManagerContext } from '@bangle.io/ui-context';
import { sleep } from '@bangle.io/utils';

import { NotificationArea } from '../NotificationArea';

describe('NotificationArea', () => {
  test('renders empty', async () => {
    const result = await render(
      <UIManager>
        <NotificationArea />
      </UIManager>,
    );

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);
  });

  test('renders with content', async () => {
    let _dispatch;
    function DummyComp() {
      const { dispatch } = useUIManagerContext();
      _dispatch = dispatch;
      return null;
    }

    const result = await render(
      <UIManager>
        <DummyComp />
        <NotificationArea />
      </UIManager>,
    );

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);

    await act(async () => {
      _dispatch({
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          uid: 'one',
          content: 'hello you!',
        },
      });
    });

    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    await act(async () => {
      _dispatch({
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          uid: 'second',
          content: 'second!',
        },
      });
    });

    expect(result.container.innerHTML.includes('hello you')).toBe(true);
    expect(result.container.innerHTML.includes('second!')).toBe(true);

    expect(result.container).toMatchSnapshot();
  });

  test('removes notification on clicking', async () => {
    let _dispatch;
    function DummyComp() {
      const { dispatch } = useUIManagerContext();
      _dispatch = dispatch;
      return null;
    }

    const result = await render(
      <UIManager>
        <DummyComp />
        <NotificationArea />
      </UIManager>,
    );

    await act(async () => {
      _dispatch({
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          uid: 'one',
          content: 'hello you!',
        },
      });
    });

    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    const prom = sleep();
    fireEvent.click(result.getByLabelText('dismiss'));
    await act(() => prom);

    expect(result.container.innerHTML.includes('hello you')).toBe(false);
  });

  test('shows buttons', async () => {
    let _dispatch;
    function DummyComp() {
      const { dispatch } = useUIManagerContext();
      _dispatch = dispatch;
      return null;
    }

    const result = await render(
      <UIManager>
        <DummyComp />
        <NotificationArea />
      </UIManager>,
    );

    await act(async () => {
      _dispatch({
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          uid: 'one',
          content: 'hello you!',
          buttons: [<span>wow!</span>],
        },
      });
    });

    expect(result.container.innerHTML.includes('wow!')).toBe(true);
  });
});
