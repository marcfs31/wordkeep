import { describe, expect, it } from 'vitest'
import { keptHref, lookupHref } from './paths'

describe('paths', () => {
  it('encodes lookup query params', () => {
    expect(lookupHref('depresión', 'es')).toBe('/?q=depresi%C3%B3n&lang=es')
  })

  it('builds a kept-word href', () => {
    expect(keptHref('abc-123')).toBe('/words/abc-123')
  })
})
