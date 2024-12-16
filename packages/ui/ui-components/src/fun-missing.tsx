/**
 * A React component that displays random fun messages for various UI states
 */
import React from 'react';
export const FunMissing = (): JSX.Element => {
  const messages = [
    'Oops! Looks like we took a wrong turn at Albuquerque!',
    'Houston, we have a problem - something got lost in space! 🚀',
    'Playing hide and seek (and winning!) 🙈',
    'Gone on vacation without leaving a forwarding address 🏖',
    'Practicing social distancing 😷',
    "Plot twist: This doesn't exist! 🎬",
    'Abducted by aliens 👽',
    'Lost in the Matrix',
    'Currently exploring parallel universes 🌌',
    'Whoopsie! Out chasing butterflies 🦋',
    'Currently attending a yoga retreat 🧘‍♀️',
    'Not found: Probably getting coffee ☕',
    'Busy building a snowman ⛄',
    'Last seen heading to Narnia 🦁',
    'Off seeking enlightenment 🕯',
    'Gone fishing! 🎣',
    'Busy learning to juggle 🤹‍♂️',
    'Joined the circus 🎪',
    'Currently climbing Mount Everest 🏔',
    'Not here: Practicing dance moves 💃',
    'Took a wrong turn at the information superhighway 🛣',
    'Currently at ninja training camp 🥷',
    'Busy planting trees 🌱',
    'Missing: Exploring the Mariana Trench 🌊',
    'Off chasing rainbows 🌈',
    'Competing in the Olympics 🏅',
    'Busy inventing time travel ⏰',
    'Away: Writing a memoir 📚',
    'On a quest for the holy grail 🏆',
    'Studying quantum mechanics 🔬',
    'Busy counting stars ⭐',
    'Missing: Learning to play the ukulele 🎸',
    'Participating in a pizza eating contest 🍕',
    'Training for a marathon 🏃‍♀️',
    'Currently solving world peace ✌️',
  ] as const;

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return <span data-testid="fun-missing-message">{randomMessage}</span>;
};
