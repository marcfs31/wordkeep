import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { LookupResult } from '@shared/types'
import { useLanguage } from '../context/LanguageContext'
import { api } from './api'

export function useLookup() {
  const { lookupLang, setLookupLang } = useLanguage()
  const [params, setParams] = useSearchParams()
  const urlQ = params.get('q') ?? ''
  const urlLang = params.get('lang') ?? ''
  const [query, setQueryState] = useState(urlQ)
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const seq = useRef(0)
  const typing = useRef(false)

  function setQuery(value: string) {
    typing.current = true
    setQueryState(value)
  }

  function choose(lemma: string, lang: string) {
    typing.current = false
    setQueryState(lemma)
    setLookupLang(lang)
    setParams({ q: lemma, lang })
  }

  useEffect(() => {
    if (urlLang && urlLang !== lookupLang) setLookupLang(urlLang)
    if (!typing.current && urlQ !== query) setQueryState(urlQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlLang])

  useEffect(() => {
    if (!typing.current) return
    const trimmed = query.trim()
    const timer = window.setTimeout(() => {
      typing.current = false
      if (trimmed.length < 2) {
        if (urlQ) setParams({}, { replace: true })
        return
      }
      if (trimmed === urlQ && (urlLang || lookupLang) === lookupLang) return
      setParams({ q: trimmed, lang: lookupLang }, { replace: true })
    }, 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lookupLang])

  useEffect(() => {
    const q = urlQ.trim()
    const lang = urlLang || lookupLang
    if (q.length < 2) {
      setLookup(null)
      setNotFound(false)
      setError('')
      setBusy(false)
      return
    }
    const n = ++seq.current
    setBusy(true)
    setNotFound(false)
    setError('')
    api
      .lookup(q, lang)
      .then((result) => {
        if (n !== seq.current) return
        setLookup(result)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch((err: Error) => {
        if (n !== seq.current) return
        setLookup(null)
        setNotFound(true)
        setError(err.message || `No dictionary entry for “${q}”.`)
      })
      .finally(() => {
        if (n === seq.current) setBusy(false)
      })
  }, [urlQ, urlLang, lookupLang])

  return { query, setQuery, choose, lookup, busy, notFound, error, lookupLang }
}
