import React from 'react';
import { InfobarIcon } from '../helper-ui/Icons';

export function TopRightMenu() {
  return (
    <div>
      <InfobarIcon
        style={{ transform: 'scale(1.1, 1.1)' }}
        className="fixed top-0 right-0 mr-4 mt-4 z-20 h-5 w-5 text-gray-100 cursor-pointer"
      />
    </div>
  );
}
