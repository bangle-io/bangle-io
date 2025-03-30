import { Squirrel } from 'lucide-react';
import React from 'react';

export function EmptyStateIllustration() {
  return (
    <div className="flex items-center justify-center">
      <Squirrel
        className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
