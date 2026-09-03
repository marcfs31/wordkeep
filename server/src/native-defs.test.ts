import assert from 'node:assert/strict'
import test from 'node:test'
import { parseNativeSenses } from './native-defs.ts'

test('parses Spanish numbered senses in the word language', () => {
  const wikitext = `== {{lengua|es}} ==
=== {{sustantivo femenino|es}} ===
;1 {{csem|psicología}}: Síndrome o conjunto de síntomas que incluyen baja autoestima.
;2: {{plm|concavidad}} o extensión de terreno de menor altitud.
;3 {{csem|economía}}: Periodo continuado de recesión.
=== Locuciones ===
*[[depresión atmosférica]]
`
  const senses = parseNativeSenses(wikitext, 'es')
  assert.equal(senses.length, 3)
  assert.equal(senses[0]?.partOfSpeech, 'noun')
  assert.match(senses[0]?.definition ?? '', /Síndrome/)
  assert.match(senses[1]?.definition ?? '', /Concavidad|terreno/)
  assert.match(senses[2]?.definition ?? '', /recesión/)
})

test('parses French hash definitions', () => {
  const wikitext = `== {{langue|fr}} ==
=== {{S|adjectif|fr}} ===
# Qui [[jouit]] du [[bonheur]], qui [[possède]] ce qui peut le [[rendre]] [[content]].
# Se dit de la [[condition]] de celui qui est heureux.
#* {{exemple|lang=fr|Heureux qui j’aimerai}}
`
  const senses = parseNativeSenses(wikitext, 'fr')
  assert.ok(senses.length >= 2)
  assert.equal(senses[0]?.partOfSpeech, 'adjective')
  assert.match(senses[0]?.definition ?? '', /jouit du bonheur/)
})

test('parses German Bedeutungen', () => {
  const wikitext = `== glücklich ({{Sprache|Deutsch}}) ==
=== {{Wortart|Adjektiv|Deutsch}} ===
{{Bedeutungen}}
:[1] Glück oder Erfolg habend
:[2] von großer Freude erfüllt
{{Synonyme}}
:[2] [[froh]]
`
  const senses = parseNativeSenses(wikitext, 'de')
  assert.equal(senses.length, 2)
  assert.equal(senses[0]?.partOfSpeech, 'adjective')
  assert.match(senses[0]?.definition ?? '', /Glück/)
})
