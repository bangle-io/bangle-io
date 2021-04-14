import React from 'react';

export function addBoldToTitle(string, query) {
  if (!query) {
    return string;
  }

  let newString = string.split(query);

  return newString.flatMap((r, i) => {
    if (i === 0) {
      return r;
    }
    return [<b key={i}>{query}</b>, r];
  });
}
