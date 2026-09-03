import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Grade, WordDetail } from '@shared/types'
import { previewInterval, recallStateFrom } from '@shared/sm2'
import { SenseExtras } from '../components/SenseExtras'
import { useStats } from '../context/StatsContext'
import { api } from '../lib/api'
import { isRtl } from '../lib/format'

const GRADE_META: Array<{ grade: Grade; label: string; key: string }> = [
  { grade: 'again', label: 'Again', key: '1' },
  { grade: 'hard', label: 'Hard', key: '2' },
  { grade: 'good', label: 'Good', key: '3' },
  { grade: 'easy', label: 'Easy', key: '4' },
]

export function Review() {
  const { stats, refresh } = useStats()
  const [queue, setQueue] = useState<WordDetail[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const [loading, setLoading] = useState(true)

  const card = queue[index]
  const hints = card
    ? {
        again: previewInterval(recallStateFrom(card), 'again'),
        hard: previewInterval(recallStateFrom(card), 'hard'),
        good: previewInterval(recallStateFrom(card), 'good'),
        easy: previewInterval(recallStateFrom(card), 'easy'),
      }
    : null

  useEffect(() => {
    api
      .queue()
      .then(setQueue)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (card) setFlipped(false)
  }, [card?.id])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        setFlipped(true)
      }
      const meta = GRADE_META.find((item) => item.key === event.key)
      if (meta && flipped) void grade(meta.grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, card, queue, index])

  async function grade(value: Grade) {
    if (!card) return
    await api.grade(card.id, value)
    refresh()
    setDone((n) => n + 1)
    const remaining = queue.filter((_, i) => i !== index)
    if (value === 'again') remaining.push(card)
    setQueue(remaining)
    setIndex(0)
    setFlipped(false)
  }

  if (loading) return <p className="text-muted">Shuffling the stack…</p>

  if (!card) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="lemma text-4xl">Nothing due.</h1>
        <p className="mt-3 text-muted">
          {stats?.lexiconCount || 'Your'} words are waiting. Come back when a card ripens, or
          introduce another.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-full bg-accent px-4 py-2 text-sm text-paper">
            Introduce a word
          </Link>
          <Link to="/words" className="rounded-full border border-rule px-4 py-2 text-sm">
            Open lexicon
          </Link>
        </div>
      </div>
    )
  }

  const primary =
    card.senses.find((sense) => sense.id === card.primarySenseId) ?? card.senses[0]

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-muted">
        {index + 1} of {queue.length} due · {done} done this sitting
      </p>
      <div className="[perspective:1400px]">
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className={`card-face relative min-h-[340px] w-full rounded-3xl border border-rule bg-paper text-left shadow-[0_30px_60px_-40px_rgba(28,23,18,0.7)] ${
            flipped ? 'is-flipped' : ''
          }`}
        >
          <div className="card-side absolute inset-0 flex flex-col items-center justify-center p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">{card.languageName}</p>
            <h1
              className="lemma mt-3 text-center text-5xl sm:text-6xl"
              dir={isRtl(card.language) ? 'rtl' : 'ltr'}
            >
              {card.displayLemma}
            </h1>
            {card.phonetic && <p className="mt-3 text-muted">{card.phonetic}</p>}
            <p className="mt-8 text-sm text-muted">Space to flip</p>
          </div>
          <div className="card-side card-back absolute inset-0 overflow-auto p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-accent">{primary?.partOfSpeech}</p>
            <p className="mt-2 text-lg leading-relaxed">{primary?.definition}</p>
            {primary && (
              <SenseExtras sense={primary} language={card.language} linked={false} compact />
            )}
            {card.etymology && (
              <p className="mt-4 border-t border-rule pt-4 text-sm text-muted">{card.etymology}</p>
            )}
            {card.note && <p className="mt-4 rounded-xl bg-paper-2 p-3 text-sm">{card.note}</p>}
          </div>
        </button>
      </div>

      <div className={`mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 ${flipped ? '' : 'opacity-40'}`}>
        {GRADE_META.map((item) => (
          <button
            key={item.grade}
            type="button"
            disabled={!flipped}
            onClick={() => void grade(item.grade)}
            className="rounded-2xl border border-rule bg-paper-2 px-3 py-3 text-sm disabled:cursor-not-allowed"
          >
            <span className="block font-semibold">{item.label}</span>
            <span className="text-xs text-muted">
              {item.key} · {hints?.[item.grade] ?? ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
