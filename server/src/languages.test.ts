import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { languageName } from './languages.ts'
import { jsonResponse } from './test/fixtures.ts'

describe('languageName', () => {
  it('falls back to the raw code when the catalog is unknown', () => {
    assert.equal(languageName('xx-test'), 'xx-test')
  })
})

describe('getLanguages', () => {
  it('uses the remote catalog when fetch succeeds', async () => {
    const { getLanguages } = await import('./languages.ts')
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      jsonResponse([
        { code: 'en', name: 'English', words: 9 },
        { code: 'es', name: 'Spanish', words: 3 },
      ])) as typeof fetch
    try {
      const list = await getLanguages(true)
      assert.ok(list.some((item) => item.code === 'en'))
      assert.ok(list[0] && list[0].words >= (list[1]?.words ?? 0))
    } finally {
      globalThis.fetch = original
    }
  })
})
