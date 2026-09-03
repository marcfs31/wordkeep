import type { TranslationDraft } from '../../shared/types.ts'
import { languageName } from './languages.ts'

const UA = 'Wordkeep/1.0 (personal lexicon; local app)'

function wikiLinks(text: string): string {
  return text
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
}

function expandTemplate(inner: string): string {
  const parts = inner.split('|').map((part) => part.trim())
  const name = (parts[0] ?? '').toLowerCase()
  const positional = parts
    .slice(1)
    .filter((part) => part && !part.includes('=') && part !== 'en')
  const named = Object.fromEntries(
    parts
      .slice(1)
      .filter((part) => part.includes('='))
      .map((part) => {
        const at = part.indexOf('=')
        return [part.slice(0, at).trim(), part.slice(at + 1).trim()]
      }),
  )

  if (name === 'w' || name === 'wikipedia' || name === 'l' || name === 'm' || name === 'lang') {
    return positional[1] || positional[0] || named.alt || ''
  }
  if (name === 'csem' || name === 'ambito' || name === 'uso') return ''
  if (name.startsWith('etimolog') || name === 'étyl' || name === 'etymon') {
    return positional.filter((part) => part.length > 1).join(' ')
  }
  if (name === 'plm') {
    const word = positional[0] ?? ''
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : ''
  }
  if (name.startsWith('coin')) {
    const who = positional.find((part) => part.length > 2) ?? positional[0]
    return who ? `Coined by ${who}` : ''
  }
  if (name === 'suffix' || name === 'prefix' || name === 'affix' || name === 'compound') {
    const bits = positional.filter((part) => part.length < 48)
    if (name === 'suffix' && bits.length >= 2) {
      return `${bits[0]} + -${bits[bits.length - 1]}`
    }
    return bits.join(' + ')
  }
  if (name === 'der' || name === 'inh' || name === 'bor' || name === 'borrowed' || name === 'calque') {
    return positional.slice(1).join(' ')
  }
  if (name === 'cog' || name === 'cognate') {
    return positional.length ? `cognate with ${positional.join(', ')}` : ''
  }
  if (name === 'ety' || name === 'was wotd' || name === 'cln' || name === 'root') return ''
  if (named.t1) return named.t1
  if (positional.length) return positional[positional.length - 1] ?? ''
  return ''
}

function replaceTemplates(text: string): string {
  let out = text
  for (let i = 0; i < 8; i += 1) {
    const next = out.replace(/\{\{([^{}]+)\}\}/g, (_, inner: string) => expandTemplate(inner))
    if (next === out) break
    out = next
  }
  return out.replace(/\{\{|\}\}/g, ' ')
}

export function cleanWiki(text: string): string {
  let out = wikiLinks(text)
  out = replaceTemplates(out)
  out = out.replace(/'{2,}/g, '')
  out = out.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
  out = out.replace(/<[^>]+>/g, ' ')
  out = out.replace(/^=+\s*\w[\w\s]*\s*=+$/gm, '')
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  return out.replace(/[ ]{2,}/g, ' ').trim()
}

function languageSection(wikitext: string, languageName: string): string | null {
  const escaped = languageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const heading = new RegExp(`^==\\s*${escaped}\\s*==\\s*$`, 'im')
  const match = heading.exec(wikitext)
  if (!match) return null
  const start = match.index + match[0].length
  const rest = wikitext.slice(start)
  const next = rest.search(/^\s*==[^=].*==\s*$/m)
  return next === -1 ? rest : rest.slice(0, next)
}

export function etymologyFrom(section: string): string | null {
  const heading =
    /===+\s*(?:\{\{\s*S\s*\|[^}]*étymolog[^}]*\}\}|Etimolog[íi]a|Etymologie|Etymology)[^=]*===+\s*([\s\S]*?)(?=\n===+|$)/gi
  const parts: string[] = []
  let match: RegExpExecArray | null
  while ((match = heading.exec(section))) {
    const cleaned = cleanWiki(match[1] ?? '')
    if (cleaned.length > 8) parts.push(cleaned)
  }
  if (!parts.length) {
    const herkunft = /\{\{Herkunft\}\}\s*([\s\S]*?)(?=\n\{\{[A-ZÄÖÜ]|\n===+)/i.exec(section)
    if (herkunft?.[1]) {
      const cleaned = cleanWiki(herkunft[1])
      if (cleaned.length > 8) parts.push(cleaned)
    }
  }
  if (!parts.length) return null
  return parts.join('\n\n').slice(0, 1400)
}

function translationsFrom(section: string, originLang: string): TranslationDraft[] {
  const byLanguage = new Map<string, TranslationDraft>()
  const re = /\{\{t(?:t|\+)?(?:-simple|-check|\+check)?\|([^|}]+)\|([^|}]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(section))) {
    const language = match[1]?.trim()
    const lemma = match[2]?.trim()
    if (!language || !lemma || language === originLang || byLanguage.has(language)) continue
    byLanguage.set(language, {
      lemma,
      language,
      languageName: languageName(language),
    })
    if (byLanguage.size >= 160) break
  }
  return [...byLanguage.values()]
}

function termsFromTemplates(section: string, names: string[]): string[] {
  const nameRe = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(`\\{\\{(?:${nameRe})\\|([^}]+)\\}\\}`, 'gi')
  const seen = new Set<string>()
  const out: string[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(section))) {
    const parts = (match[1] ?? '').split('|')
    for (const raw of parts.slice(1)) {
      const term = raw.trim()
      if (!term || term.includes('=') || term.length > 42) continue
      const key = term.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(term)
      if (out.length >= 24) return out
    }
  }
  return out
}

export type WikiExtras = {
  etymology: string | null
  translations: TranslationDraft[]
  synonyms: string[]
  antonyms: string[]
}

export async function fetchWikiExtras(
  word: string,
  langName: string,
  langCode: string,
): Promise<WikiExtras> {
  const url = new URL('https://en.wiktionary.org/w/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', word)
  url.searchParams.set('prop', 'wikitext')
  url.searchParams.set('format', 'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('redirects', '1')

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { etymology: null, translations: [], synonyms: [], antonyms: [] }
    const data = (await res.json()) as { parse?: { wikitext?: string } }
    const wikitext = data.parse?.wikitext
    if (!wikitext) return { etymology: null, translations: [], synonyms: [], antonyms: [] }

    const section = languageSection(wikitext, langName) ?? wikitext
    const local = translationsFrom(section, langCode)
    return {
      etymology: etymologyFrom(section) ?? etymologyFrom(wikitext),
      translations: local.length ? local : translationsFrom(wikitext, langCode),
      synonyms: termsFromTemplates(section, ['syn', 'synonyms']),
      antonyms: termsFromTemplates(section, ['ant', 'antonyms']),
    }
  } catch {
    return { etymology: null, translations: [], synonyms: [], antonyms: [] }
  }
}

