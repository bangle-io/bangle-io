import React from 'react';

export function ErrorBanner({
  dataTestId,
  title,
  content,
}: {
  dataTestId?: string;
  title: string;
  content: string;
}) {
  return (
    <div
      className="m-3 p-4 rounded bg-colorCriticalSolidFaint"
      data-testid={dataTestId}
    >
      <div className="font-semibold text-lg text-left">{title}</div>
      <div className="text-left font-light mt-2">{content}</div>
    </div>
  );
}
