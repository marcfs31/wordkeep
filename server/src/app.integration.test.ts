import './test/db-env.ts'
import assert from 'node:assert/strict'
import { afterEach, before, describe, it } from 'node:test'
import { app } from './app.ts'
import { db } from './db.ts'
import { clearLookupCache } from './lookup.ts'
import { insertFromLookup } from './words.ts'
import { installDictionaryMock, lookupFixture } from './test/fixtures.ts'

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>
}

describe('API integration', () => {
  before(() => {
    db.exec('DELETE FROM word_links')
    db.exec('DELETE FROM senses')
    db.exec('DELETE FROM words')
  })

  afterEach(() => {
    clearLookupCache()
  })

  it('GET /api/health', async () => {
    const res = await app.request('/api/health')
    assert.equal(res.status, 200)
    const body = await json(res)
    assert.equal(body.ok, true)
    assert.equal(typeof body.version, 'string')
  })

  it('GET /api/lookup validates q and serves a mocked entry', async () => {
    const missing = await app.request('/api/lookup')
    assert.equal(missing.status, 400)

    const restore = installDictionaryMock()
    try {
      const res = await app.request('/api/lookup?q=happy&lang=en')
      assert.equal(res.status, 200)
      const body = await json(res)
      assert.equal(body.displayLemma, 'happy')
    } finally {
      restore()
    }
  })

  it('keeps, reads, patches, reviews, and deletes a word', async () => {
    const restore = installDictionaryMock()
    try {
      const created = await app.request('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'happy', lang: 'en', note: 'demo' }),
      })
      assert.equal(created.status, 201)
      const payload = (await created.json()) as { alreadyKept: boolean; word: { id: string; note: string } }
      assert.equal(payload.alreadyKept, false)
      const id = payload.word.id

      const again = await app.request('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'happy', lang: 'en' }),
      })
      assert.equal(again.status, 200)
      assert.equal(((await again.json()) as { alreadyKept: boolean }).alreadyKept, true)

      const listed = await app.request('/api/words?q=happy')
      assert.equal((await listed.json() as unknown[]).length, 1)

      const patched = await app.request(`/api/words/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'updated' }),
      })
      assert.equal(((await patched.json()) as { note: string }).note, 'updated')

      const queue = await app.request('/api/review/queue')
      assert.ok(((await queue.json()) as unknown[]).length >= 1)

      const graded = await app.request(`/api/review/${id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: 'good' }),
      })
      assert.equal(graded.status, 200)

      const badGrade = await app.request(`/api/review/${id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: 'nope' }),
      })
      assert.equal(badGrade.status, 400)

      const graph = await app.request(`/api/graph?wordId=${id}`)
      const graphBody = (await graph.json()) as { nodes: unknown[]; edges: unknown[] }
      assert.ok(graphBody.nodes.length >= 1)

      const stats = await app.request('/api/stats')
      assert.equal(typeof ((await stats.json()) as { lexiconCount: number }).lexiconCount, 'number')

      const removed = await app.request(`/api/words/${id}`, { method: 'DELETE' })
      assert.equal(removed.status, 200)
      const missing = await app.request(`/api/words/${id}`)
      assert.equal(missing.status, 404)
    } finally {
      restore()
    }
  })

  it('GET /api/suggest with empty q', async () => {
    const res = await app.request('/api/suggest')
    assert.equal(res.status, 200)
    assert.deepEqual(await json(res), { query: '', detected: [], suggestions: [] })
  })

  it('GET /api/graph for a missing word is empty', async () => {
    const res = await app.request('/api/graph?wordId=nope')
    assert.deepEqual(await json(res), { nodes: [], edges: [] })
  })

  it('POST /api/words requires q and lang', async () => {
    const res = await app.request('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })

  it('exports and imports a lexicon backup', async () => {
    const restore = installDictionaryMock()
    try {
      await app.request('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'happy', lang: 'en' }),
      })
      const exported = await app.request('/api/export')
      assert.equal(exported.status, 200)
      const backup = await exported.json()
      const imported = await app.request('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'merge', backup }),
      })
      assert.equal(imported.status, 200)
    } finally {
      restore()
    }
  })

  it('play bank reports size for a language', async () => {
    const res = await app.request('/api/play/bank?lang=en')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { bankSize: number }
    assert.equal(typeof body.bankSize, 'number')
  })
})

describe('API graph with repository data', () => {
  it('returns seeded-style links from insertFromLookup', async () => {
    const word = insertFromLookup(lookupFixture({ lemma: 'joyful', displayLemma: 'joyful' }), '', 0)
    const res = await app.request(`/api/graph?wordId=${word.id}`)
    const body = (await res.json()) as { nodes: Array<{ kind: string }>; edges: Array<{ relation: string }> }
    assert.ok(body.nodes.some((node) => node.kind === 'center'))
    assert.ok(body.edges.some((edge) => edge.relation === 'synonym' || edge.relation === 'translation'))
  })
})
