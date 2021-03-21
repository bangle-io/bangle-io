import React, { useState, useCallback, useMemo } from 'react';
import { getLast } from '../misc/index';

export const PaletteContext = React.createContext();

export function PaletteContextProvider({ children }) {
  const [state, setState] = useState({ stack: [], execute: false });

  const push = useCallback(
    (val) => {
      setState({
        ...state,
        stack: [val],
        execute: false,
      });
    },
    [setState, state],
  );

  const onExecute = useCallback(
    (val = true) => {
      setState({
        ...state,
        execute: val,
      });
    },
    [setState, state],
  );

  const updateCurrent = useCallback(
    (val) => {
      const current = getLast(state.stack);
      let newCurrent = typeof val === 'function' ? val(current) : val;

      setState({
        ...state,
        execute: false,
        stack: [
          ...state.stack.slice(0, state.stack.length - 1),
          { ...current, ...newCurrent },
        ],
      });
    },
    [setState, state],
  );

  const clear = useCallback(
    (val) => {
      setState({
        ...state,
        stack: [],
        execute: false,
      });
    },
    [setState, state],
  );

  const value = useMemo(() => {
    return {
      updateCurrent,
      push,
      clear,
      execute: state.execute,
      onExecute,
      current: getLast(state.stack),
    };
  }, [clear, updateCurrent, push, state, onExecute]);

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}
