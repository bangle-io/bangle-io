export function funPlaceholder(): string {
  const messages = [
    'A blank page is just a masterpiece waiting to happen. 🎨',
    'Start small—your next big idea could begin right here!',
    'No notes yet? Think of this as your creative launchpad. 🚀',
    'Empty? More like unlimited potential.',
    'Every great story starts with a single word...',
    'Ready to turn this blank space into brilliance? ⚡',
    "Your ideas belong here—let's make magic happen! 🪄",
    'A fresh canvas for your wildest thoughts.',
    'Dream big, jot small—it all starts now!',
    'This is where inspiration lives—go find it! ✨',
    'Think it, write it, own it!',
    "Hello, creative genius—what's on your mind? 💡",
    'Start scribbling—your future self will thank you.',
    "The best ideas are waiting to be written—what's yours?",
    'An empty note today, a groundbreaking idea tomorrow!',
    'Your imagination deserves this space.',
    'Write the first word; the rest will follow.',
    'All great thinkers start here: a blank note.',
    'The world is your notebook—start jotting!',
    'Let your creativity roam free—this is your playground.',
    'An empty screen, but the possibilities are endless.',
    "Notes are for dreamers—what's your dream? 💭",
    'Make this space yours—scribble, jot, or doodle!',
    'Ideas are fleeting; catch them here! 🎣',
    'Every blank page is a chance to change the world.',
    "The story starts here—what's your opening line?",
    'Think it, note it, create it!',
    "Nothing here… yet. Let's fix that! ⚡",
    'Your next big breakthrough starts with this blank note.',
    'Turn this empty space into your idea factory!',
  ];

  return (
    messages[Math.floor(Math.random() * messages.length)] ??
    'A blank page is just a masterpiece waiting to happen. 🎨'
  );
}
