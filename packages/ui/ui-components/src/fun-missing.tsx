/**
 * A React component that displays random fun messages for various UI states
 */
import React from 'react';
export const FunMissing = (): JSX.Element => {
  const messages = [
    'Oops! Looks like this page took a wrong turn at Albuquerque!',
    'Houston, we have a problem - this page is lost in space! 🚀',
    '404: Page playing hide and seek (and winning!) 🙈',
    'This page has gone on vacation without leaving a forwarding address 🏖',
    'Looks like this page is practicing social distancing 😷',
    "Plot twist: This page doesn't exist! 🎬",
    'This page has been abducted by aliens 👽',
    'Error 404: Page got lost in the Matrix',
    'This page is currently exploring parallel universes 🌌',
    'Whoopsie! This page is out chasing butterflies 🦋',
    'This page is currently attending a yoga retreat 🧘‍♀️',
    "Page not found: It's probably getting coffee ☕",
    'This page is busy building a snowman ⛄',
    '404: Page last seen heading to Narnia 🦁',
    'This page is off seeking enlightenment 🕯',
    'Page gone fishing! 🎣',
    'This page is busy learning to juggle 🤹‍♂️',
    '404: Page joined the circus 🎪',
    'This page is currently climbing Mount Everest 🏔',
    "Page not found: It's practicing its dance moves 💃",
    'This page took a wrong turn at the information superhighway 🛣',
    '404: Page is attending a ninja training camp 🥷',
    'This page is busy planting trees 🌱',
    "Page not found: It's exploring the Mariana Trench 🌊",
    'This page is off chasing rainbows 🌈',
    '404: Page is competing in the Olympics 🏅',
    'This page is busy inventing time travel ⏰',
    "Page not found: It's writing its memoir 📚",
    'This page is on a quest for the holy grail 🏆',
    '404: Page is studying quantum mechanics 🔬',
    'This page is busy counting stars ⭐',
    "Page not found: It's learning to play the ukulele 🎸",
    'This page is participating in a pizza eating contest 🍕',
    '404: Page is training for a marathon 🏃‍♀️',
    'This page is currently solving world peace ✌️',
  ] as const;

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return <div data-testid="fun-missing-message">{randomMessage}</div>;
};
