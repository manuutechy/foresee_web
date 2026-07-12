const PALETTE = ['blue', 'orange', 'purple', 'teal']

function paletteIndex(category) {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % PALETTE.length
}

// Deterministic hash so the same category always lands on the same color.
export function categoryColorClass(category) {
  return `tag-${PALETTE[paletteIndex(category)]}`
}

// Same palette, as an inline-style-ready CSS var reference — used for solid
// fills (e.g. the thumbnail avatar) where a .tag-* tint class isn't right.
// "blue" maps to --accent (the brand accent token), not a literal --blue var.
const VAR_NAMES = { blue: '--accent', orange: '--orange', purple: '--purple', teal: '--teal' }

export function categoryAccentVar(category) {
  return `var(${VAR_NAMES[PALETTE[paletteIndex(category)]]})`
}
