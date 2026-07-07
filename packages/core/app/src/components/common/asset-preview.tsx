import type { AssetPreviewKind } from '@bangle.io/ws-path';
import React from 'react';

interface AssetPreviewProps {
  kind: AssetPreviewKind;
  /** A `blob:`/`object:` URL pointing at the asset's bytes. */
  objectUrl: string;
  fileName: string;
  /**
   * Decoded UTF-8 contents used to render the `text` kind. Ignored for every
   * other kind, where the browser reads the bytes straight from `objectUrl`.
   */
  textContent?: string;
}

/**
 * Renders a workspace asset inline using only native browser elements. Image,
 * PDF, video, audio, and plain-text assets each map to the element the browser
 * already knows how to display, so no third-party viewer is required. When the
 * browser cannot decode the media (unknown codec, corrupt bytes) the component
 * degrades to a short "no preview" note; the asset page keeps the Download
 * affordance available alongside it.
 */
export function AssetPreview({
  kind,
  objectUrl,
  fileName,
  textContent,
}: AssetPreviewProps) {
  // Callers remount this component per asset (keyed on `objectUrl`), so the
  // failure state never needs to be reset for a newly opened file.
  const [hasMediaError, setHasMediaError] = React.useState(false);

  if (hasMediaError) {
    return (
      <p className="max-w-md text-muted-foreground text-sm">
        {t.app.pageAsset.noPreview}
      </p>
    );
  }

  switch (kind) {
    case 'image':
      return (
        <img
          alt={fileName}
          className="mx-auto max-h-[75vh] max-w-full rounded-md object-contain"
          onError={() => setHasMediaError(true)}
          src={objectUrl}
        />
      );
    case 'pdf':
      return (
        <iframe
          className="h-[80vh] w-full rounded-md border border-border bg-background"
          src={objectUrl}
          title={fileName}
        />
      );
    case 'video':
      return (
        <video
          className="mx-auto max-h-[75vh] max-w-full rounded-md"
          controls
          onError={() => setHasMediaError(true)}
          src={objectUrl}
        >
          {/* Workspace media carries no caption sidecar; an empty captions
              track keeps the element accessible without inventing content. */}
          <track kind="captions" />
          {t.app.pageAsset.videoUnsupported}
        </video>
      );
    case 'audio':
      return (
        <audio
          className="w-full max-w-md"
          controls
          onError={() => setHasMediaError(true)}
          src={objectUrl}
        >
          <track kind="captions" />
          {t.app.pageAsset.audioUnsupported}
        </audio>
      );
    case 'text':
      return (
        <pre className="max-h-[75vh] w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-4 text-left font-mono text-foreground text-sm">
          {textContent ?? ''}
        </pre>
      );
    default: {
      // Exhaustiveness check: every AssetPreviewKind must be handled above.
      const _exhaustiveCheck: never = kind;
      throw new Error(`Unknown asset preview kind: ${_exhaustiveCheck}`);
    }
  }
}
