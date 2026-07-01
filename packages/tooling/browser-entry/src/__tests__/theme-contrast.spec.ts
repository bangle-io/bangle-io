import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

type OklchColor = {
  L: number;
  C: number;
  H: number;
};

type LinearRgbColor = {
  r: number;
  g: number;
  b: number;
};

const cssPath = join(dirname(fileURLToPath(import.meta.url)), '../index.css');
const css = readFileSync(cssPath, 'utf8');
const legacyThemeCssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../default-theme.processed.css',
);
const legacyThemeCss = readFileSync(legacyThemeCssPath, 'utf8');

function getBlock(cssContent: string, selector: string): string {
  const match = new RegExp(
    `${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(cssContent);
  if (!match?.[1]) {
    throw new Error(`Unable to find theme block for ${selector}`);
  }
  return match[1];
}

function getVariable(block: string, variableName: string): string {
  const match = new RegExp(`${variableName}:\\s*([^;]+);`).exec(block);
  if (!match?.[1]) {
    throw new Error(`Unable to find ${variableName}`);
  }
  return match[1].trim();
}

function parseOklch(value: string): OklchColor {
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/.exec(value);
  if (!match) {
    throw new Error(`Expected OKLCH color, received "${value}"`);
  }
  return {
    L: Number(match[1]),
    C: Number(match[2]),
    H: Number(match[3]),
  };
}

function parseRawHsl(value: string): LinearRgbColor {
  const match = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(value);
  if (!match) {
    throw new Error(`Expected raw HSL color, received "${value}"`);
  }

  const h = Number(match[1]) / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  if (s === 0) {
    return srgbToLinearRgb({ r: l, g: l, b: l });
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToRgb = (input: number): number => {
    let t = input;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return srgbToLinearRgb({
    r: hueToRgb(h + 1 / 3),
    g: hueToRgb(h),
    b: hueToRgb(h - 1 / 3),
  });
}

function srgbChannelToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function srgbToLinearRgb({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): LinearRgbColor {
  return {
    r: srgbChannelToLinear(r),
    g: srgbChannelToLinear(g),
    b: srgbChannelToLinear(b),
  };
}

function oklchToLinearSrgb({ L, C, H }: OklchColor): LinearRgbColor {
  const hueRadians = (H * Math.PI) / 180;
  const a = C * Math.cos(hueRadians);
  const b = C * Math.sin(hueRadians);

  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function clampRgbChannel(channel: number): number {
  return Math.min(1, Math.max(0, channel));
}

function relativeLuminance({ r, g, b }: LinearRgbColor): number {
  return (
    0.2126 * clampRgbChannel(r) +
    0.7152 * clampRgbChannel(g) +
    0.0722 * clampRgbChannel(b)
  );
}

function contrastRatio(colorA: LinearRgbColor, colorB: LinearRgbColor): number {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);

  return (
    (Math.max(luminanceA, luminanceB) + 0.05) /
    (Math.min(luminanceA, luminanceB) + 0.05)
  );
}

describe('browser theme contrast', () => {
  const activePairs = [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--popover', '--popover-foreground'],
    ['--primary', '--primary-foreground'],
    ['--secondary', '--secondary-foreground'],
    ['--muted', '--muted-foreground'],
    ['--accent', '--accent-foreground'],
    ['--destructive', '--destructive-foreground'],
    ['--popover', '--destructive-text'],
    ['--sidebar', '--sidebar-foreground'],
    ['--sidebar-primary', '--sidebar-primary-foreground'],
    ['--sidebar-accent', '--sidebar-accent-foreground'],
  ] as const;

  test.each([
    { name: 'light', selector: ':root' },
    { name: 'dark', selector: '.BU_dark-scheme' },
  ])('$name active theme surface pairs are readable', ({ name, selector }) => {
    const block = getBlock(css, selector);

    for (const [backgroundVariable, foregroundVariable] of activePairs) {
      const background = oklchToLinearSrgb(
        parseOklch(getVariable(block, backgroundVariable)),
      );
      const foreground = oklchToLinearSrgb(
        parseOklch(getVariable(block, foregroundVariable)),
      );

      expect(
        contrastRatio(background, foreground),
        `${name} ${backgroundVariable}/${foregroundVariable}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  const legacyPairs = [
    ['--BV-background', '--BV-wiki-link-foreground'],
    ['--BV-wiki-link-hover-background', '--BV-wiki-link-hover-foreground'],
    ['--BV-background', '--BV-wiki-link-missing-foreground'],
    [
      '--BV-wiki-link-missing-hover-background',
      '--BV-wiki-link-missing-foreground',
    ],
    ['--BV-accent', '--BV-accent-foreground'],
    ['--BV-accent', '--BV-secondary-foreground'],
    ['--BV-pop', '--BV-pop-foreground'],
  ] as const;

  test.each([
    { name: 'light', selector: ':root' },
    { name: 'dark', selector: '.BU_dark-scheme' },
  ])('$name legacy editor theme pairs are readable', ({ name, selector }) => {
    const block = getBlock(legacyThemeCss, selector);

    for (const [backgroundVariable, foregroundVariable] of legacyPairs) {
      const background = parseRawHsl(getVariable(block, backgroundVariable));
      const foreground = parseRawHsl(getVariable(block, foregroundVariable));

      expect(
        contrastRatio(background, foreground),
        `${name} ${backgroundVariable}/${foregroundVariable}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
