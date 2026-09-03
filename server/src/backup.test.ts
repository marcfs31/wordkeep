import './test/db-env.ts'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { db } from './db.ts'
import { exportLexicon, importLexicon } from './backup.ts'
import { lookupFixture } from './test/fixtures.ts'
import { getWord, insertFromLookup, listWords } from './words.ts'

describe('lexicon backup', () => {
  it('round-trips words through export and replace import', () => {
    db.exec('DELETE FROM word_links')
    db.exec('DELETE FROM senses')
    db.exec('DELETE FROM words')
    insertFromLookup(lookupFixture({ lemma: 'backup', displayLemma: 'backup' }), 'keep me', 0)
    const dump = exportLexicon()
    assert.ok(dump.words.length >= 1)
    assert.equal(dump.version, 1)

    db.exec('DELETE FROM word_links')
    db.exec('DELETE FROM senses')
    db.exec('DELETE FROM words')
    assert.equal(listWords({}).length, 0)

    const result = importLexicon(dump, 'replace')
    assert.ok(result.words >= 1)
    const restored = listWords({ q: 'backup' })[0]
    assert.equal(restored?.displayLemma, 'backup')
    assert.equal(getWord(restored!.id)?.note, 'keep me')
  })

  it('rejects invalid payloads', () => {
    assert.throws(() => importLexicon({ version: 2 }), /Invalid backup/)
  })
})
