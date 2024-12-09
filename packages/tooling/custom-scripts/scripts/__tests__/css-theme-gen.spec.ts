import { describe, expect, it } from 'vitest';
import {
  convertColorToHslString,
  parseThemeVariables,
  validateVariables,
} from '../css-theme-gen';

describe('convertColorToHslString', () => {
  it('converts hsl()', () => {
    expect(convertColorToHslString('hsl(200 100% 95%)')).toBe('200 100% 95%');
  });

  it('converts hex', () => {
    const result = convertColorToHslString('#f3f4f6');
    // Check result is something like "220 13% 96%"
    // Just verify format and ranges:
    const parts = result.split(' ');
    expect(parts.length).toBe(3);
    const h = Number.parseInt(parts?.[0] ?? '', 10);
    const s = Number.parseInt(parts?.[1] ?? '', 10);
    const l = Number.parseInt(parts?.[2] ?? '', 10);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(360);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(100);
  });

  it('converts rgb()', () => {
    const result = convertColorToHslString('rgb(180, 200, 220)');
    const parts = result.split(' ');
    expect(parts.length).toBe(3);
  });

  it('converts named colors', () => {
    const result = convertColorToHslString('red');
    expect(result).toMatch(/^\d+\s\d+%\s\d+%$/);
  });

  it('handles non-color values', () => {
    expect(convertColorToHslString('0.5rem')).toBe('0.5rem');
    expect(convertColorToHslString('12px')).toBe('12px');
    expect(convertColorToHslString('auto')).toBe('auto');
  });
});

describe('validateVariables', () => {
  it('passes with matching keys and differing values', () => {
    expect(() =>
      validateVariables(
        { '--var1': 'hsl(200 100% 95%)', '--var2': 'hsl(210 35% 78%)' },
        { '--var1': 'hsl(210 80% 50%)', '--var2': 'hsl(220 50% 50%)' },
      ),
    ).not.toThrow();
  });

  it('fails if a key is missing in dark', () => {
    expect(() =>
      validateVariables(
        { '--var1': 'hsl(200 100% 95%)' },
        { '--var2': 'hsl(210 80% 50%)' },
      ),
    ).toThrow();
  });

  it('fails if values are identical', () => {
    expect(() =>
      validateVariables(
        { '--var1': '200 100% 95%' },
        { '--var1': '200 100% 95%' },
      ),
    ).toThrow();
  });

  it('passes with matching color values that differ', () => {
    expect(() =>
      validateVariables(
        {
          '--color1': '#ff0000',
          '--radius': '0.5rem',
        },
        {
          '--color1': '#00ff00',
        },
      ),
    ).not.toThrow();
  });

  it('allows non-color variables to exist only in light theme', () => {
    expect(() =>
      validateVariables(
        {
          '--color1': '#ff0000',
          '--radius': '0.5rem',
          '--spacing': '1rem',
        },
        {
          '--color1': '#00ff00',
        },
      ),
    ).not.toThrow();
  });

  it('fails if dark theme contains non-color variables', () => {
    expect(() =>
      validateVariables(
        {
          '--color1': '#ff0000',
          '--radius': '0.5rem',
        },
        {
          '--color1': '#00ff00',
          '--radius': '0.5rem',
        },
      ),
    ).toThrow(/Dark theme contains non-color variable/);
  });

  it('fails if color variable is missing from dark theme', () => {
    expect(() =>
      validateVariables(
        {
          '--color1': '#ff0000',
          '--color2': '#00ff00',
          '--radius': '0.5rem',
        },
        {
          '--color1': '#0000ff',
        },
      ),
    ).toThrow(/Missing dark theme variable for color/);
  });
});

describe('convertColorToHslString extended', () => {
  it('handles edge case hue values', () => {
    expect(convertColorToHslString('hsl(0 100% 50%)')).toBe('0 100% 50%');
    expect(convertColorToHslString('hsl(360 100% 50%)')).toBe('0 100% 50%');
  });

  it('normalizes percentage values', () => {
    expect(convertColorToHslString('hsl(120 200% 50%)')).toBe('120 100% 50%');
    expect(convertColorToHslString('hsl(120 50% 150%)')).toBe('0 0% 100%');
  });

  it('handles common colors correctly', () => {
    expect(convertColorToHslString('#000000')).toBe('0 0% 0%');
    expect(convertColorToHslString('#FFFFFF')).toBe('0 0% 100%');
    expect(convertColorToHslString('#FF0000')).toBe('0 100% 50%');
  });

  it('handles different HSL formats', () => {
    expect(convertColorToHslString('hsl(200, 100%, 50%)')).toBe('200 100% 50%');
    expect(convertColorToHslString('hsla(200 100% 50% / 1)')).toBe(
      '200 100% 50%',
    );
  });

  it('handles RGB percentage values', () => {
    expect(convertColorToHslString('rgb(50%, 50%, 50%)')).toBe('0 0% 50%');
  });

  it('preserves reasonable precision', () => {
    const result = convertColorToHslString('rgb(123, 45, 67)');
    const [h, s, l] = result.split(' ');
    expect(Number(h)).toBeLessThan(360);
    expect(h).not.toContain('.');
    expect(s).toMatch(/^\d{1,3}%$/);
    expect(l).toMatch(/^\d{1,3}%$/);
  });
});

describe('parseThemeVariables', () => {
  it('extracts variables from :root and dark scheme', () => {
    const css = `
      :root {
        --color-primary: #ff0000;
        --color-secondary: rgb(0, 255, 0);
      }
      .BU_dark-scheme {
        --color-primary: #000000;
        --color-secondary: rgb(255, 255, 255);
      }
    `;

    const result = parseThemeVariables(css);
    expect(result.light['--color-primary']).toBe('#ff0000');
    expect(result.light['--color-secondary']).toBe('rgb(0, 255, 0)');
    expect(result.dark['--color-primary']).toBe('#000000');
    expect(result.dark['--color-secondary']).toBe('rgb(255, 255, 255)');
  });

  it('handles empty CSS', () => {
    const result = parseThemeVariables('');
    expect(result.light).toEqual({});
    expect(result.dark).toEqual({});
  });

  it('handles CSS with no variables', () => {
    const css = `
      :root { color: red; }
      .BU_dark-scheme { color: black; }
    `;
    const result = parseThemeVariables(css);
    expect(result.light).toEqual({});
    expect(result.dark).toEqual({});
  });

  it('ignores variables in other selectors', () => {
    const css = `
      .other-class {
        --ignored-var: blue;
      }
      :root {
        --test: red;
      }
    `;
    const result = parseThemeVariables(css);
    expect(result.light['--test']).toBe('red');
    expect(result.light['--ignored-var']).toBeUndefined();
  });

  it('handles multiple declarations of same variable', () => {
    const css = `
      :root {
        --color: blue;
        --color: red;
      }
    `;
    const result = parseThemeVariables(css);
    expect(result.light['--color']).toBe('red');
  });

  it('handles mixed color and non-color variables', () => {
    const css = `
      :root {
        --color: #ff0000;
        --radius: 0.5rem;
        --spacing: 1rem;
      }
      .BU_dark-scheme {
        --color: #000000;
      }
    `;

    const result = parseThemeVariables(css);
    expect(result.light['--color']).toBe('#ff0000');
    expect(result.light['--radius']).toBe('0.5rem');
    expect(result.light['--spacing']).toBe('1rem');
    expect(result.dark['--color']).toBe('#000000');
    expect(result.dark['--radius']).toBeUndefined();
    expect(result.dark['--spacing']).toBeUndefined();
  });
});
