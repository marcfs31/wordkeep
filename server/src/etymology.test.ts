import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cleanWiki } from './etymology.ts'

describe('cleanWiki', () => {
  it('unwraps wiki links and piped links', () => {
    assert.equal(cleanWiki('[[happiness]] and [[joy|delight]]'), 'happiness and delight')
  })

  it('expands derivation and suffix templates', () => {
    const text = cleanWiki('{{der|en|fro|hap}} plus {{suffix|en|hap|y}}')
    assert.match(text, /hap/)
    assert.match(text, /hap \+ -y/)
  })

  it('drops empty editorial templates and refs', () => {
    const text = cleanWiki("{{cln|en|emotions}} ''hello'' <ref>x</ref> {{csem|psicología}}")
    assert.equal(text.includes('cln'), false)
    assert.match(text, /hello/)
  })

  it('capitalizes Spanish plm headwords', () => {
    assert.match(cleanWiki('{{plm|concavidad}} del terreno'), /^Concavidad/)
  })
})

describe('etymologyFrom', () => {
  it('reads Spanish Etimología sections', async () => {
    const { etymologyFrom } = await import('./etymology.ts')
    const text = etymologyFrom(`=== Etimología ===\n{{etimología|la|depressio}}\n=== Sustantivo ===\n`)
    assert.ok(text)
    assert.match(text, /depressio/)
  })

  it('reads German Herkunft blocks', async () => {
    const { etymologyFrom } = await import('./etymology.ts')
    const text = etymologyFrom(`{{Herkunft}}\n:[[Ableitung]] von ''[[Glück]]'' mit ''[[-lich]]''\n{{Synonyme}}\n`)
    assert.ok(text)
    assert.match(text, /Glück/)
  })
})
