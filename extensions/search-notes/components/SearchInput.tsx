import React, { useCallback, useEffect, useRef } from 'react';
import { Input } from 'ui-components';

export const SearchInput = ({
  searchQuery,
  updateSearchQuery,
}: {
  searchQuery: string;
  updateSearchQuery: (q: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onClear = useCallback(
    (e) => {
      e.preventDefault();
      updateSearchQuery('');
    },
    [updateSearchQuery],
  );

  const onChange = useCallback(
    (e) => {
      updateSearchQuery(e.target.value);
    },
    [updateSearchQuery],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Input
      label="Search"
      ref={inputRef}
      showClear
      value={searchQuery}
      onClear={onClear}
      onChange={onChange}
      placeholder="Search"
    />
  );
};
