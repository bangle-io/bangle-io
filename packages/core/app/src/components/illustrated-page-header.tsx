import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import React from 'react';

interface IllustratedPageHeaderProps {
  title: string;
  illustration?: React.ReactNode;
}

/** Displays a centered header with a title and an optional illustration (defaults to Bangle logo). */
export function IllustratedPageHeader({
  title,
  illustration,
}: IllustratedPageHeaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {illustration ? (
        <div className="mb-4 flex justify-center opacity-40">
          {illustration}
        </div>
      ) : (
        <a
          href="https://bangle.io"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-60"
        >
          <img
            src={bangleIcon}
            alt={t.app.common.bangleLogoAlt}
            className="h-28 w-28 opacity-40 grayscale"
          />
        </a>
      )}

      <h2 className="font-semibold text-xl tracking-widest">{title}</h2>
    </div>
  );
}
