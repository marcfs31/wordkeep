export function groupByPos<T extends { partOfSpeech: string }>(senses: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const sense of senses) {
    const key = sense.partOfSpeech || 'sense'
    const list = map.get(key) ?? []
    list.push(sense)
    map.set(key, list)
  }
  return [...map.entries()]
}
