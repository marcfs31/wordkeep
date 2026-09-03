import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { looksLexical, parseFrequency, shortDefinition } from './play.ts'

describe('looksLexical', () => {
  it('rejects digits and path-like tokens', () => {
    assert.equal(looksLexical('word2', 'en'), false)
    assert.equal(looksLexical('foo/bar', 'en'), false)
  })

  it('requires length 7 for Latin and 2 characters for CJK', () => {
    assert.equal(looksLexical('short', 'en'), false)
    assert.equal(looksLexical('lexicon', 'en'), true)
    assert.equal(looksLexical('字', 'zh'), false)
    assert.equal(looksLexical('汉字', 'zh'), true)
  })
})

describe('parseFrequency', () => {
  it('skips the head of the list and keeps long lexical words', () => {
    const lines = Array.from({ length: 40 }, (_, i) => `the${i}\t${1000 - i}`)
    lines.push('dictionary\t9', 'vocabulary\t8', 'a\t7')
    const words = parseFrequency(lines.join('\n'), 'en')
    assert.ok(words.includes('dictionary'))
    assert.ok(words.includes('vocabulary'))
    assert.equal(words.includes('a'), false)
  })
})

describe('shortDefinition', () => {
  it('keeps short glosses intact', () => {
    assert.equal(shortDefinition('  Feeling  pleasure.  '), 'Feeling pleasure.')
  })

  it('clips long glosses on a word boundary', () => {
    const long = 'x'.repeat(200) + ' extra'
    const clipped = shortDefinition(long)
    assert.ok(clipped.endsWith('…'))
    assert.ok(clipped.length <= 181)
  })
})
