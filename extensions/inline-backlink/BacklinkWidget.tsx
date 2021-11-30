import React from 'react';

export function BacklinkWidget() {
  const backlinks = [];
  return (
    <div className="note-outline_container flex flex-col">
      {(!backlinks || backlinks.length === 0) && (
        <span className="font-light">{'<No backlinks found>'}</span>
      )}
    </div>
  );
}
