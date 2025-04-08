/**
 * A React component that displays random fun messages for various UI states
 */
import React from 'react';
export const FunMissing = () => {
  const messages = t.app.funMessages;

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return <span data-testid="fun-missing-message">{randomMessage}</span>;
};
