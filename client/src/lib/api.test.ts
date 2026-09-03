import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns JSON on success and encodes query params', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/api/lookup?q=happy&lang=en')
      return new Response(JSON.stringify({ lemma: 'happy' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await api.lookup('happy', 'en')
    expect(result).toEqual({ lemma: 'happy' })
  })

  it('throws the server error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'No definitions found' }), { status: 404 })),
    )
    await expect(api.lookup('nope', 'en')).rejects.toThrow('No definitions found')
  })

  it('omits empty word filters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/words')
      return new Response(JSON.stringify([]), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await api.words({ q: undefined, status: '' })
  })
})
