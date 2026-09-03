export function lookupHref(lemma: string, lang: string): string {
  return `/?q=${encodeURIComponent(lemma)}&lang=${encodeURIComponent(lang)}`
}

export function keptHref(id: string): string {
  return `/words/${id}`
}
