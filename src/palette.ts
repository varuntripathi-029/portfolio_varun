export const palette = [
  'var(--c-indigo)',
  'var(--c-emerald)',
  'var(--c-vermilion)',
  'var(--c-violet)',
  'var(--c-magenta)',
  'var(--c-teal)',
]

export const accentAt = (i: number) => palette[i % palette.length]
