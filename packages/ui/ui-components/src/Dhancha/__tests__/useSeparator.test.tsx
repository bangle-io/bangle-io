/**
 * @jest-environment @bangle.io/jsdom-env
 */

import { fireEvent, render, renderHook } from '@testing-library/react';
import React from 'react';

import { waitForExpect } from '@bangle.io/test-utils-jest';

import { useSeparator } from '../index';

describe('useSeparator hook', () => {
  function TestComponent({
    minWidth = 200,
    maxWidth = 500,
    defaultWidth = 300,
    onChange,
    onStart,
    onFinish,
    type = 'left',
  }: {
    onStart?: () => void;
    onFinish?: () => void;
    onChange: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
    defaultWidth?: number;
    type?: 'left' | 'right';
  }) {
    const props = useSeparator({
      onChange,
      type,
      defaultWidth,
      minWidth,
      maxWidth,
      onStart,
      onFinish,
    });

    return <div {...props} data-testid="separator" />;
  }

  it('should initiate with given default width', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() =>
      useSeparator({
        onChange: onChangeMock,
        type: 'left',
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      }),
    );

    expect(result.current.ref.current).toBeNull();
  });

  it('should update width when mouse is moved', async () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(<TestComponent onChange={onChangeMock} />);

    const separator = getByTestId('separator');

    fireEvent.mouseDown(separator, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 150 });

    await waitForExpect(() => {
      expect(onChangeMock).toHaveBeenCalledWith(350);
    });
  });

  it('should not exceed maximum width when mouse is moved', async () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(<TestComponent onChange={onChangeMock} />);

    const separator = getByTestId('separator');

    fireEvent.mouseDown(separator, { clientX: 450 });
    fireEvent.mouseMove(window, { clientX: 700 });

    await waitForExpect(() => {
      expect(onChangeMock).toHaveBeenCalledWith(500); // maxWidth
    });
  });

  it('should not go below minimum width when mouse is moved', async () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(<TestComponent onChange={onChangeMock} />);

    const separator = getByTestId('separator');

    fireEvent.mouseDown(separator, { clientX: 450 });
    fireEvent.mouseMove(window, { clientX: 100 });

    await waitForExpect(() => {
      expect(onChangeMock).toHaveBeenCalledWith(200); // minWidth
    });
  });

  it('should call onStart when mouse down is triggered', () => {
    const onStartMock = jest.fn();
    const { getByTestId } = render(
      <TestComponent
        onChange={jest.fn()}
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
        onStart={onStartMock}
      />,
    );

    const separator = getByTestId('separator');
    fireEvent.mouseDown(separator, { clientX: 100 });

    expect(onStartMock).toHaveBeenCalledTimes(1);
  });

  it('should call onFinish when mouse up is triggered', async () => {
    const onFinishMock = jest.fn();
    const { getByTestId } = render(
      <TestComponent
        onChange={jest.fn()}
        onFinish={onFinishMock}
        type="left"
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
      />,
    );

    const separator = getByTestId('separator');
    fireEvent.mouseDown(separator, { clientX: 100 });
    fireEvent.mouseUp(window);

    await waitForExpect(() => {
      expect(onFinishMock).toHaveBeenCalledTimes(1);
    });
  });

  it('should update width correctly when dragging to the left', async () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(
      <TestComponent
        onChange={onChangeMock}
        type="left"
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
      />,
    );

    const separator = getByTestId('separator');
    fireEvent.mouseDown(separator, { clientX: 250 });
    fireEvent.mouseMove(window, { clientX: 200 });

    await waitForExpect(() => {
      expect(onChangeMock).toHaveBeenCalledWith(250); // Should reduce by the difference
    });
  });

  it('should update width correctly when dragging to the right', async () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(
      <TestComponent
        onChange={onChangeMock}
        type="right"
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
      />,
    );

    const separator = getByTestId('separator');
    fireEvent.mouseDown(separator, { clientX: 250 });
    fireEvent.mouseMove(window, { clientX: 300 });

    await waitForExpect(() => {
      expect(onChangeMock).toHaveBeenCalledWith(250); // Should increase by the difference
    });
  });

  it('should set cursor style on mouse down and reset on mouse up', () => {
    const { getByTestId } = render(
      <TestComponent
        onChange={jest.fn()}
        type="left"
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
      />,
    );

    const separator = getByTestId('separator');
    fireEvent.mouseDown(separator, { clientX: 100 });
    expect(document.body.style.cursor).toBe('col-resize');

    fireEvent.mouseUp(window);
    expect(document.body.style.cursor).toBe('');
  });

  it('should update className when dragging', () => {
    const TestComponent = () => {
      const separatorProps = useSeparator({
        onChange: jest.fn(),
        type: 'left',
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      });

      return <div {...separatorProps} data-testid="separator" />;
    };

    const { getByTestId } = render(<TestComponent />);
    const separator = getByTestId('separator');

    fireEvent.mouseDown(separator);

    expect(separator.className).toContain('BU_is-active');

    fireEvent.mouseUp(separator);

    expect(separator.className).not.toContain('BU_is-active');
  });
});
