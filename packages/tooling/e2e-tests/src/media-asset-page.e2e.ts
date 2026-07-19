import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  ctrlKey,
  getEditorLocator,
  writeStoredFile,
  writeStoredMarkdown,
} from './common';

/**
 * Bytes of a valid 0.1s 8-bit mono PCM WAV, generated procedurally so the
 * asset page's `<audio>` element can actually decode it (duration and
 * metadata load) rather than only render a player shell.
 */
function makeWavBytes(): number[] {
  const sampleRate = 8000;
  const numSamples = 800;
  const bytes = new Uint8Array(44 + numSamples);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      bytes[offset + i] = text.charCodeAt(i);
    }
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate (8-bit mono)
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, numSamples, true);
  for (let i = 0; i < numSamples; i++) {
    bytes[44 + i] =
      128 + Math.round(100 * Math.sin((2 * Math.PI * 440 * i) / sampleRate));
  }
  return [...bytes];
}

/**
 * Records a short real WebM video in the browser (canvas capture +
 * MediaRecorder) so the asset page's `<video>` element has genuinely
 * decodable bytes to load metadata from.
 */
function recordWebmBytes(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('canvas 2d context unavailable');
    }
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    // Paint a handful of frames so the capture stream emits real video data.
    await new Promise<void>((resolve) => {
      let frames = 0;
      const paint = () => {
        context.fillStyle = frames % 2 === 0 ? '#3b82f6' : '#ef4444';
        context.fillRect(0, 0, canvas.width, canvas.height);
        frames += 1;
        if (frames >= 12) {
          resolve();
          return;
        }
        requestAnimationFrame(paint);
      };
      requestAnimationFrame(paint);
    });
    recorder.stop();
    await stopped;
    for (const track of stream.getTracks()) {
      track.stop();
    }
    const blob = new Blob(chunks, { type: 'video/webm' });
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
}

test('opens audio and video assets in their native players and survives reload', async ({
  page,
}, testInfo) => {
  const workspaceName = `media-asset-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'media-note';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  await writeStoredFile(
    page,
    workspaceName,
    'assets/tone.wav',
    makeWavBytes(),
    'audio/wav',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'assets/clip.webm',
    await recordWebmBytes(page),
    'video/webm',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    '[tone.wav](assets/tone.wav)\n\n[clip.webm](assets/clip.webm)',
  );
  await page.reload({ waitUntil: 'domcontentloaded' });

  const editor = getEditorLocator(page, {});

  await page.keyboard.down(ctrlKey);
  await editor.getByRole('link', { name: 'tone.wav' }).click();
  await page.keyboard.up(ctrlKey);
  await expect(
    page.getByRole('heading', { name: 'tone.wav', exact: true }),
  ).toBeVisible();
  const audio = page.locator('audio');
  await expect(audio).toBeVisible();
  await expect(audio).toHaveAttribute('src', /^blob:/);
  await expect(audio).toHaveAttribute('controls');
  // The stored bytes are genuinely decodable: metadata loads and the known
  // 0.1s duration is reported, not just a player shell around dead bytes.
  await expect
    .poll(() =>
      audio.evaluate((element) => (element as HTMLAudioElement).duration),
    )
    .toBeCloseTo(0.1, 2);

  await page.goBack();
  await page.keyboard.down(ctrlKey);
  await editor.getByRole('link', { name: 'clip.webm' }).click();
  await page.keyboard.up(ctrlKey);
  await expect(
    page.getByRole('heading', { name: 'clip.webm', exact: true }),
  ).toBeVisible();
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /^blob:/);
  await expect(video).toHaveAttribute('controls');
  // videoWidth only becomes non-zero once the browser has decoded real
  // metadata from the recorded bytes.
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).videoWidth),
    )
    .toBe(64);

  // The asset page must keep working on a direct reload (persistence path).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'clip.webm', exact: true }),
  ).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('src', /^blob:/);
});
