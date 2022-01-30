/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useSliceState } from '@bangle.io/bangle-store-context';
import { sleep } from '@bangle.io/utils';

import { NotificationArea } from '../NotificationArea';

jest.mock('@bangle.io/bangle-store-context', () => {
  return { useSliceState: jest.fn() };
});

beforeEach(() => {
  useSliceState.mockImplementation(() => ({
    store: { dispatch: jest.fn(), state: {} },
    sliceState: { notifications: [] },
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
    useSliceState.mockImplementation(() => ({
      store: { dispatch: uiDispatchMock, state: {} },
      sliceState: { notifications: notificationsObj.notifications },
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

    expect(useSliceState).toBeCalledTimes(1);

    await result.rerender(<NotificationArea />);

    expect(useSliceState).toBeCalledTimes(2);
    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    notificationsObj.notifications = [
      { uid: 'one', content: 'hello you!' },
      {
        uid: 'second',
        content: 'second!',
      },
    ];

    await result.rerender(<NotificationArea />);
    expect(useSliceState).toBeCalledTimes(3);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);
    expect(result.container.innerHTML.includes('second!')).toBe(true);

    expect(result.container).toMatchSnapshot();
  });

  test('removes notification on clicking', async () => {
    const uiDispatchMock = jest.fn();
    let notificationsObj = { notifications: [] };
    useSliceState.mockImplementation(() => ({
      store: { dispatch: uiDispatchMock, state: {} },
      sliceState: { notifications: notificationsObj.notifications },
    }));
    const result = await render(<NotificationArea />);

    notificationsObj.notifications = [{ uid: 'one', content: 'hello you!' }];

    await result.rerender(<NotificationArea />);
    expect(useSliceState).toBeCalledTimes(2);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    const prom = sleep();
    fireEvent.click(result.getByLabelText('dismiss'));
    await act(() => prom);

    expect(uiDispatchMock).toBeCalledTimes(1);
    expect(uiDispatchMock).nthCalledWith(1, {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uid: 'one',
      },
    });
  });
});
