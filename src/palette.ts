export const palette = [
  'var(--c-indigo)',
  'var(--c-emerald)',
  'var(--c-vermilion)',
  'var(--c-violet)',
  'var(--c-magenta)',
  'var(--c-teal)',
]

export const accentAt = (i: number) => palette[i % palette.length]

// Chip hues sit mostly in a cool analogous band (blue → violet → teal) with an occasional
// warm coral, so a row of chips reads as one palette instead of a rainbow.
const hues = [262, 238, 288, 212, 178, 308, 24]

export const hueAt = (i: number) => hues[i % hues.length]
