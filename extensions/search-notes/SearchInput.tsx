import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Input } from 'ui-components';

export function SearchInput({ className = '', query, updateQuery }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onClear = useCallback(
    (e) => {
      e.preventDefault();
      updateQuery('');
    },
    [updateQuery],
  );

  const onChange = useCallback(
    (e) => {
      updateQuery(e.target.value);
    },
    [updateQuery],
  );
  return (
    <Input
      label="Search"
      className={className}
      ref={inputRef}
      showClear
      onClear={onClear}
      value={query}
      onChange={onChange}
      placeholder="Search"
    />
  );
}
