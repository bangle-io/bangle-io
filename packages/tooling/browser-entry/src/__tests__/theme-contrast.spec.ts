import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

type OklchColor = {
  L: number;
  C: number;
  H: number;
};

const cssPath = join(dirname(fileURLToPath(import.meta.url)), '../index.css');
const css = readFileSync(cssPath, 'utf8');

function getBlock(selector: string): string {
  const match = new RegExp(
    `${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(css);
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

function oklchToLinearSrgb({ L, C, H }: OklchColor) {
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

function relativeLuminance(color: OklchColor): number {
  const { r, g, b } = oklchToLinearSrgb(color);
  return (
    0.2126 * clampRgbChannel(r) +
    0.7152 * clampRgbChannel(g) +
    0.0722 * clampRgbChannel(b)
  );
}

function contrastRatio(colorA: OklchColor, colorB: OklchColor): number {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);

  return (
    (Math.max(luminanceA, luminanceB) + 0.05) /
    (Math.min(luminanceA, luminanceB) + 0.05)
  );
}

describe('browser theme contrast', () => {
  test.each([
    { name: 'light', selector: ':root' },
    { name: 'dark', selector: '.BU_dark-scheme' },
  ])('$name destructive foreground is readable on destructive background', ({
    selector,
  }) => {
    const block = getBlock(selector);
    const destructive = parseOklch(getVariable(block, '--destructive'));
    const destructiveForeground = parseOklch(
      getVariable(block, '--destructive-foreground'),
    );

    expect(
      contrastRatio(destructive, destructiveForeground),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
