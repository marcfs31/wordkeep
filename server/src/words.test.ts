import './test/db-env.ts'
import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import { db } from './db.ts'
import { wordGraph } from './graph.ts'
import { lookupFixture } from './test/fixtures.ts'
import {
  deleteWord,
  getWord,
  gradeWord,
  insertFromLookup,
  listWords,
  recentWords,
  reviewQueue,
  stats,
  updateWord,
} from './words.ts'

function resetDb() {
  db.exec('DELETE FROM word_links')
  db.exec('DELETE FROM senses')
  db.exec('DELETE FROM words')
}

describe('words repository', () => {
  before(() => resetDb())

  it('inserts a lookup with senses, translations, synonyms, and antonyms', () => {
    resetDb()
    const word = insertFromLookup(lookupFixture(), 'mnemonic', 0)
    assert.equal(word.displayLemma, 'happy')
    assert.equal(word.note, 'mnemonic')
    assert.equal(word.senses.length, 1)
    assert.equal(word.senses[0]?.definition.includes('pleasure'), true)
    const relations = new Set(word.links.map((link) => link.relation))
    assert.ok(relations.has('translation'))
    assert.ok(relations.has('synonym'))
    assert.ok(relations.has('antonym'))
    assert.ok(word.links.some((link) => link.lemma === 'feliz'))
  })

  it('lists, filters, archives, and deletes', () => {
    resetDb()
    const happy = insertFromLookup(lookupFixture(), '', 0)
    insertFromLookup(lookupFixture({ lemma: 'sad', displayLemma: 'sad', senses: lookupFixture().senses }), '', 0)

    assert.equal(listWords({}).length, 2)
    assert.equal(listWords({ q: 'hap' }).length, 1)
    assert.equal(listWords({ language: 'en' }).length, 2)

    const archived = updateWord(happy.id, { archived: true, note: 'later' })
    assert.ok(archived?.archivedAt)
    assert.equal(listWords({}).length, 1)
    assert.equal(listWords({ archived: true }).length, 1)

    assert.equal(deleteWord(happy.id), true)
    assert.equal(getWord(happy.id), null)
    assert.equal(deleteWord('missing'), false)
  })

  it('grades due cards and updates stats', () => {
    resetDb()
    const word = insertFromLookup(lookupFixture({ lemma: 'cold', displayLemma: 'cold' }), '', 0)
    assert.equal(reviewQueue().length, 1)
    const graded = gradeWord(word.id, 'good')
    assert.equal(graded?.status, 'learning')
    assert.ok((graded?.dueAt ?? 0) > Date.now())
    assert.equal(gradeWord('missing', 'good'), null)

    const snapshot = stats()
    assert.equal(snapshot.lexiconCount, 1)
    assert.equal(snapshot.languageCount, 1)
    assert.equal(recentWords(1)[0]?.displayLemma, 'cold')
  })

  it('builds lexicon and ego graphs with relation-typed edges', () => {
    resetDb()
    const happy = insertFromLookup(lookupFixture(), '', 0)
    insertFromLookup(
      lookupFixture({
        lemma: 'glad',
        displayLemma: 'glad',
        senses: [
          {
            partOfSpeech: 'adjective',
            definition: 'Pleased.',
            examples: [],
            synonyms: ['happy'],
            antonyms: ['sad'],
            tags: [],
          },
        ],
        translations: [],
      }),
      '',
      0,
    )

    const lexicon = wordGraph()
    assert.ok(lexicon.nodes.length >= 2)
    assert.ok(lexicon.edges.some((edge) => edge.relation === 'synonym'))

    const ego = wordGraph(happy.id)
    assert.equal(ego.nodes.some((node) => node.kind === 'center'), true)
    assert.ok(ego.edges.some((edge) => edge.relation === 'translation'))
    assert.deepEqual(wordGraph('missing'), { nodes: [], edges: [] })
  })
})
