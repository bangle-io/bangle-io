import React from 'react';

export function ErrorBanner({
  className,
  dataTestId,
  title,
  content,
}: {
  className?: string;
  dataTestId?: string;
  title: string;
  content: string;
}) {
  return (
    <div
      className="m-3 p-4 rounded"
      data-testid={dataTestId}
      style={{
        backgroundColor: 'var(--BV-severity-error-color)',
        color: 'white',
      }}
    >
      <div className="font-semibold text-lg text-left">{title}</div>
      <div className="text-left font-light mt-2">{content}</div>
    </div>
  );
}
