export const palette = [
  'var(--c-blue)',
  'var(--c-emerald)',
  'var(--c-vermilion)',
  'var(--c-ochre)',
  'var(--c-burgundy)',
  'var(--c-teal)',
]

export const accentAt = (i: number) => palette[i % palette.length]

// Chip hues are earth pigments (denim 245, moss 160, terracotta 40, ochre 85, petrol 195,
// brick 15, olive 130). Nothing sits in the violet range 260 to 330.
const hues = [245, 160, 40, 85, 195, 15, 130]

export const hueAt = (i: number) => hues[i % hues.length]
