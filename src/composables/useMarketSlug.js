// Builds a readable, shareable market URL segment: the question kebab-cased,
// truncated, with a short hex suffix from the real id so it stays unique and
// resolvable even if two questions are near-identical. The API resolves this
// back to the real market by matching the trailing hex fragment (see
// ResolveMarketID server-side) — old plain-UUID links keep working too.
export function marketSlug(question, id) {
  const words = (question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .join('-')
    .slice(0, 60)
    .replace(/-+$/, '')
  const suffix = (id || '').replace(/-/g, '').slice(-8)
  return words ? `${words}-${suffix}` : suffix
}

export function marketPath(market) {
  return `/markets/${marketSlug(market.question, market.id)}`
}
