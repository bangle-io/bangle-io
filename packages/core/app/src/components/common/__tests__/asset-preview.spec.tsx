// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { AssetPreview } from '../asset-preview';

const OBJECT_URL = 'blob:https://bangle.test/asset';

describe('AssetPreview', () => {
  it('renders an image with the file name as alt text', () => {
    render(
      <AssetPreview kind="image" objectUrl={OBJECT_URL} fileName="photo.png" />,
    );

    const img = screen.getByRole('img', { name: 'photo.png' });
    expect(img).toHaveAttribute('src', OBJECT_URL);
  });

  it('renders a PDF inside a titled iframe', () => {
    render(
      <AssetPreview kind="pdf" objectUrl={OBJECT_URL} fileName="report.pdf" />,
    );

    const frame = screen.getByTitle('report.pdf');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', OBJECT_URL);
  });

  it('renders a native video player', () => {
    const { container } = render(
      <AssetPreview kind="video" objectUrl={OBJECT_URL} fileName="clip.mp4" />,
    );

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', OBJECT_URL);
    expect(video).toHaveAttribute('controls');
    // Keeps the a11y captions track even though workspace media has none.
    expect(
      container.querySelector('video > track[kind="captions"]'),
    ).not.toBeNull();
  });

  it('renders a native audio player', () => {
    const { container } = render(
      <AssetPreview kind="audio" objectUrl={OBJECT_URL} fileName="song.mp3" />,
    );

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio).toHaveAttribute('src', OBJECT_URL);
    expect(audio).toHaveAttribute('controls');
  });

  it('renders decoded text verbatim in a preformatted block', () => {
    render(
      <AssetPreview
        kind="text"
        objectUrl={OBJECT_URL}
        fileName="notes.txt"
        textContent={'line one\n  indented two'}
      />,
    );

    const pre = screen.getByText(/line one/);
    expect(pre.tagName).toBe('PRE');
    expect(pre.textContent).toBe('line one\n  indented two');
  });

  it('falls back to a no-preview note when media fails to decode', () => {
    render(
      <AssetPreview
        kind="image"
        objectUrl={OBJECT_URL}
        fileName="broken.png"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'broken.png' }));

    expect(screen.getByText(t.app.pageAsset.noPreview)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
