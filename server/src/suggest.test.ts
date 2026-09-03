import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectLanguages, fold } from './suggest.ts'

describe('fold', () => {
  it('strips combining marks so depresión matches depresion', () => {
    assert.equal(fold('depresión'), fold('depresion'))
    assert.equal(fold('Glücklich'), fold('glucklich'))
  })
})

describe('detectLanguages', () => {
  it('detects Spanish from ñ and -ción', () => {
    assert.ok(detectLanguages('depresión').includes('es'))
    assert.ok(detectLanguages('niño').includes('es'))
  })

  it('does not treat ó as a Polish cue', () => {
    assert.equal(detectLanguages('depresión').includes('pl'), false)
  })

  it('detects French, German, Portuguese, and Polish diacritics', () => {
    assert.ok(detectLanguages('heureux').includes('fr'))
    assert.ok(detectLanguages('heiß').includes('de'))
    assert.ok(detectLanguages('nação').includes('pt'))
    assert.ok(detectLanguages('żółć').includes('pl'))
  })

  it('detects CJK, Hangul, Arabic, Cyrillic, and Hebrew', () => {
    assert.ok(detectLanguages('ひらがな').includes('ja'))
    assert.ok(detectLanguages('한국어').includes('ko'))
    assert.ok(detectLanguages('中文').includes('zh'))
    assert.ok(detectLanguages('سلام').includes('ar'))
    assert.ok(detectLanguages('привет').includes('ru'))
    assert.ok(detectLanguages('שלום').includes('he'))
  })
})
