import React, { useState, useCallback, useMemo } from 'react';
import { getLast } from '../misc/index';

export const PaletteSwitchContext = React.createContext();

export function PaletteSwitch({ children }) {
  const [state, setState] = useState({ stack: [] });

  const push = useCallback(
    (val) => {
      setState({
        ...state,
        stack: [val],
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
      });
    },
    [setState, state],
  );

  const value = useMemo(() => {
    return {
      updateCurrent,
      push,
      clear,
      current: getLast(state.stack),
    };
  }, [clear, updateCurrent, push, state]);

  return (
    <PaletteSwitchContext.Provider value={value}>
      {children}
    </PaletteSwitchContext.Provider>
  );
}
