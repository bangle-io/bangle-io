import { describe, expect, it, vi } from 'vitest';
import {
  createPwaOpenInAppPromptActions,
  shouldShowPwaOpenInAppPrompt,
} from '../pwa-open-in-app-prompt-controller';

describe('PWA open-in-app prompt controller', () => {
  const eligible = {
    alertDialogOpen: false,
    canOpenInApp: true,
    hasShown: false,
    installedThisSession: false,
    promptSeen: false,
  };

  it('shows only for an unseen prior install with no competing alert', () => {
    expect(shouldShowPwaOpenInAppPrompt(eligible)).toBe(true);
    expect(
      shouldShowPwaOpenInAppPrompt({ ...eligible, promptSeen: true }),
    ).toBe(false);
    expect(
      shouldShowPwaOpenInAppPrompt({ ...eligible, canOpenInApp: false }),
    ).toBe(false);
    expect(
      shouldShowPwaOpenInAppPrompt({ ...eligible, installedThisSession: true }),
    ).toBe(false);
    expect(
      shouldShowPwaOpenInAppPrompt({ ...eligible, alertDialogOpen: true }),
    ).toBe(false);
  });

  it('continues into the app while cancel stays non-destructive', () => {
    const openInApp = vi.fn();
    const actions = createPwaOpenInAppPromptActions({ openInApp });

    actions.onCancel();
    expect(openInApp).not.toHaveBeenCalled();
    actions.onContinue();
    expect(openInApp).toHaveBeenCalledOnce();
  });
});
