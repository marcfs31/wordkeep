import { describe, expect, it } from 'vitest'
import { groupByPos } from './senses'

describe('groupByPos', () => {
  it('groups senses and uses a fallback key', () => {
    const grouped = groupByPos([
      { partOfSpeech: 'noun', definition: 'a' },
      { partOfSpeech: 'noun', definition: 'b' },
      { partOfSpeech: '', definition: 'c' },
    ])
    expect(grouped.map(([pos, items]) => [pos, items.length])).toEqual([
      ['noun', 2],
      ['sense', 1],
    ])
  })
})
