// Motivational lines shown on the overview. Only the keys live here; the text
// itself is translated like everything else the user reads.
export const QUOTE_KEYS = [
  'quoteKeepGoing',
  'quoteOneDay',
  'quoteUrgeWave',
  'quoteStrength',
  'quoteProgress',
  'quoteFuture',
  'quoteSmallSteps',
  'quoteStart'
];

// Stable for the whole day, so the card does not reshuffle on every render.
export const getQuoteOfTheDay = (now: Date = new Date()): number => {
  const dayNumber = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / (24 * 60 * 60 * 1000)
  );
  return ((dayNumber % QUOTE_KEYS.length) + QUOTE_KEYS.length) % QUOTE_KEYS.length;
};
