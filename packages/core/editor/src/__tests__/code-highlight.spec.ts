import { copyTextToClipboard } from '../code-highlight';
import { vi } from 'vitest';

function createFakeTextArea() {
  return {
    value: '',
    setAttribute: vi.fn(),
    style: {
      position: '',
      left: '',
      top: '',
      opacity: '',
      pointerEvents: '',
    },
    focus: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
  };
}

describe('copyTextToClipboard', () => {
  test('uses clipboard api when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createElement = vi.fn(() => createFakeTextArea());

    const result = await copyTextToClipboard('console.log(1);', {
      clipboard: { writeText: writeText },
      document: {
        createElement: createElement,
        body: {
          appendChild: vi.fn(),
        },
        execCommand: vi.fn(() => true),
      },
    });

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('console.log(1);');
    expect(createElement).not.toHaveBeenCalled();
  });

  test('falls back to document copy command when clipboard fails', async () => {
    const textarea = createFakeTextArea();
    const appendChild = vi.fn();
    const execCommand = vi.fn(() => true);

    const result = await copyTextToClipboard('line 1\nline 2', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('blocked')),
      },
      document: {
        createElement: vi.fn(() => textarea),
        body: { appendChild: appendChild },
        execCommand: execCommand,
      },
    });

    expect(result).toBe(true);
    expect(textarea.value).toBe('line 1\nline 2');
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(textarea.remove).toHaveBeenCalled();
  });

  test('returns false when fallback cannot execute copy command', async () => {
    const result = await copyTextToClipboard('x', {
      document: {
        createElement: vi.fn(() => createFakeTextArea()),
        body: { appendChild: vi.fn() },
      },
    });

    expect(result).toBe(false);
  });
});
