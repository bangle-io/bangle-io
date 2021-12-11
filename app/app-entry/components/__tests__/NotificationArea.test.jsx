import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useUIManagerContext } from '@bangle.io/ui-context';
import { sleep } from '@bangle.io/utils';

import { NotificationArea } from '../NotificationArea';

jest.mock('@bangle.io/ui-context', () => {
  return { useUIManagerContext: jest.fn() };
});

beforeEach(() => {
  useUIManagerContext.mockImplementation(() => ({
    dispatch: jest.fn(),
    notifications: [],
  }));
});

describe('NotificationArea', () => {
  test('renders empty', async () => {
    const result = await render(<NotificationArea />);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);
  });

  test('renders with content', async () => {
    const uiDispatchMock = jest.fn();
    let notificationsObj = { notifications: [] };
    useUIManagerContext.mockImplementation(() => ({
      dispatch: uiDispatchMock,
      notifications: notificationsObj.notifications,
    }));

    const result = await render(<NotificationArea />);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);

    notificationsObj.notifications = [{ uid: 'one', content: 'hello you!' }];

    expect(useUIManagerContext).toBeCalledTimes(1);

    await result.rerender(<NotificationArea />);

    expect(useUIManagerContext).toBeCalledTimes(2);
    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    notificationsObj.notifications = [
      { uid: 'one', content: 'hello you!' },
      {
        uid: 'second',
        content: 'second!',
      },
    ];

    await result.rerender(<NotificationArea />);
    expect(useUIManagerContext).toBeCalledTimes(3);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);
    expect(result.container.innerHTML.includes('second!')).toBe(true);

    expect(result.container).toMatchSnapshot();
  });

  test('removes notification on clicking', async () => {
    const uiDispatchMock = jest.fn();
    let notificationsObj = { notifications: [] };
    useUIManagerContext.mockImplementation(() => ({
      dispatch: uiDispatchMock,
      notifications: notificationsObj.notifications,
    }));
    const result = await render(<NotificationArea />);

    notificationsObj.notifications = [{ uid: 'one', content: 'hello you!' }];

    await result.rerender(<NotificationArea />);
    expect(useUIManagerContext).toBeCalledTimes(2);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    const prom = sleep();
    fireEvent.click(result.getByLabelText('dismiss'));
    await act(() => prom);

    expect(uiDispatchMock).toBeCalledTimes(1);
    expect(uiDispatchMock).nthCalledWith(1, {
      type: 'UI/DISMISS_NOTIFICATION',
      value: {
        uid: 'one',
      },
    });
  });
});
