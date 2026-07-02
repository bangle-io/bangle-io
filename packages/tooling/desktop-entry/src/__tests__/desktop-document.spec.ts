import { describe, expect, it } from 'vitest';
import {
  DESKTOP_PLATFORM_ATTRIBUTE,
  markDesktopPlatform,
} from '../desktop-document';

describe('desktop document markers', () => {
  it('marks the renderer document with the desktop platform', () => {
    const attributes = new Map<string, string>();
    const documentRef = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attributes.set(name, value);
        },
      },
    };

    markDesktopPlatform(documentRef as never, 'darwin');

    expect(attributes.get(DESKTOP_PLATFORM_ATTRIBUTE)).toBe('darwin');
  });
});
