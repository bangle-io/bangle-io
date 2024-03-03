import React from 'react';

export const Container = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-4 text-secondary-foreground/70 select-none ${className}`}
    >
      {children}
    </div>
  );
};

export const Body = ({ children }: { children: React.ReactNode }) => {
  return <p className="text-md">{children}</p>;
};

export const Title = ({ children }: { children: React.ReactNode }) => {
  return <h1 className="text-xl font-semibold  mb-1">{children}</h1>;
};
