// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Calendar } from '../calendar';

const DECEMBER_2025 = new Date(2025, 11, 1);

describe('Calendar', () => {
  it('renders a month grid with weekday headers', () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={DECEMBER_2025} />,
    );

    // react-day-picker renders the month as a table with role="grid".
    expect(screen.getByRole('grid')).toBeInTheDocument();
    // Seven weekday headers (Sun..Sat).
    expect(container.querySelectorAll('.rdp-weekday')).toHaveLength(7);
  });

  it('calls onSelect with the clicked day', () => {
    const onSelect = vi.fn();
    render(
      <Calendar
        mode="single"
        defaultMonth={DECEMBER_2025}
        onSelect={onSelect}
      />,
    );

    const target = new Date(2025, 11, 24);
    const dayButton = document.querySelector(
      `[data-day="${target.toLocaleDateString()}"]`,
    );
    expect(dayButton).not.toBeNull();

    fireEvent.click(dayButton as Element);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const selected = onSelect.mock.calls[0]?.[0] as Date;
    expect(selected.getFullYear()).toBe(2025);
    expect(selected.getMonth()).toBe(11);
    expect(selected.getDate()).toBe(24);
  });

  it('marks the selected day with the single-selection data attribute', () => {
    const selected = new Date(2025, 11, 24);
    render(
      <Calendar
        mode="single"
        defaultMonth={DECEMBER_2025}
        selected={selected}
      />,
    );

    const dayButton = document.querySelector(
      `[data-day="${selected.toLocaleDateString()}"]`,
    );
    expect(dayButton).toHaveAttribute('data-selected-single', 'true');
  });

  it('renders month and year dropdowns when captionLayout is "dropdown"', () => {
    render(
      <Calendar
        mode="single"
        captionLayout="dropdown"
        defaultMonth={DECEMBER_2025}
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2030, 11)}
      />,
    );

    // Month + year dropdowns are rendered as native <select> (role combobox).
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
  });
});
