import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import React from 'react';

interface PageHeaderProps {
  title: string;
  illustration?: React.ReactNode; // Make illustration optional
}

/** Displays a centered header with a title and an optional illustration (defaults to Bangle logo). */
export function PageHeader({ title, illustration }: PageHeaderProps) {
  // Use provided illustration or default to Bangle logo link
  const illustrationContent = illustration ?? (
    <a
      href="https://bangle.io"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-opacity hover:opacity-60"
    >
      <img
        src={bangleIcon}
        alt="Bangle logo"
        className="h-28 w-28 opacity-40 grayscale"
      />
    </a>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {/* Render the determined illustration content */}
      <div className="mb-4 flex justify-center opacity-40">
        {illustrationContent}
      </div>
      <h2 className="font-semibold text-xl tracking-widest">{title}</h2>
    </div>
  );
}
