import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import React from 'react';

interface PageHeaderProps {
  title: string;
  illustration?: React.ReactNode;
}

/**
 * Displays a centered header with a title and an optional illustration.
 * Defaults to showing the Bangle logo as the illustration.
 * This component now incorporates the logic from the previous IllustratedPageHeader.
 */
export function PageHeader({ title, illustration }: PageHeaderProps) {
  // Use provided illustration or default to Bangle logo link
  const illustrationContent = illustration ?? (
    <a
      href="https://bangle.io"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-opacity hover:opacity-60"
      aria-label={t.app.common.bangleLogoAlt}
    >
      <img
        src={bangleIcon}
        alt={t.app.common.bangleLogoAlt}
        className="h-28 w-28 opacity-40 grayscale"
      />
    </a>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="mb-4 flex justify-center opacity-40">
        {illustrationContent}
      </div>
      <h2 className="font-semibold text-xl tracking-widest">{title}</h2>
    </div>
  );
}
