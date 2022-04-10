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
      className="m-3 p-4 rounded"
      data-testid={dataTestId}
      style={{
        backgroundColor: 'var(--BV-error-bg-color)',
        color: 'var(--BV-error-color)',
      }}
    >
      <div className="font-semibold text-lg text-left">{title}</div>
      <div className="text-left font-light mt-2">{content}</div>
    </div>
  );
}
